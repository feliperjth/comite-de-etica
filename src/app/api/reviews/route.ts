import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import {
  sendEmail,
  buildReviewerColleagueDoneEmail,
} from "@/lib/email";
import { requireStaff } from "@/lib/auth";
import {
  applyApproval,
  applyCorrections,
  buildCorrections,
  getFeedbackDocs,
} from "@/lib/outcome";

interface SectionPayload {
  section_key: string;
  decision: "accepted" | "corrections";
  standard_comments: string[];
  custom_comment: string;
}

/**
 * Revisiones ya emitidas por quien está en sesión, para que el dashboard sepa
 * qué proyectos tiene hechos.
 *
 * Antes el navegador consultaba `reviews` directamente con la clave anónima,
 * filtrando por una cookie de nombre — falsificable, y además obligaba a dejar
 * la tabla legible por cualquiera. Ahora la identidad sale de la sesión.
 */
export async function GET(req: NextRequest) {
  const { session, response } = await requireStaff(req);
  if (response) return response;

  const supabase = getSupabaseServer();

  // Mismo criterio de nombre que el POST: la ficha de revisor manda.
  const { data: reviewerRow } = await supabase
    .from("reviewers")
    .select("name")
    .eq("email", session.email)
    .maybeSingle();

  const reviewer_name = reviewerRow?.name ?? session.name ?? session.email;

  const { data, error } = await supabase
    .from("reviews")
    .select("project_id, round")
    .eq("reviewer_name", reviewer_name);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reviews: data ?? [] });
}

export async function POST(req: NextRequest) {
  try {
    // La identidad del revisor sale de la sesión firmada, no del cuerpo:
    // antes se aceptaba cualquier reviewer_name que enviara el cliente.
    const { session, response } = await requireStaff(req);
    if (response) return response;

    const {
      project_id,
      round,
      origin,
      sections,
    }: {
      project_id: string;
      round: number;
      origin: string;
      sections: SectionPayload[];
    } = await req.json();

    const supabase = getSupabaseServer();

    // El nombre con el que se firma la revisión debe ser el de la ficha de
    // revisor, que es como se referencia en projects.reviewer/reviewer2.
    const { data: reviewerRow } = await supabase
      .from("reviewers")
      .select("name")
      .eq("email", session.email)
      .maybeSingle();

    const reviewer_name  = reviewerRow?.name ?? session.name ?? session.email;
    const reviewer_email = session.email;

    // 1. Check if this reviewer already submitted for this round
    const { data: existing } = await supabase
      .from("reviews")
      .select("id")
      .eq("project_id", project_id)
      .eq("reviewer_name", reviewer_name)
      .eq("round", round)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Ya enviaste tu revisión para esta ronda." }, { status: 400 });
    }

    // 2. Compute overall decision
    const overall_decision = sections.some((s) => s.decision === "corrections")
      ? "corrections"
      : "accepted";

    // 3. Insert review
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .insert({ project_id, reviewer_name, reviewer_email, round, overall_decision })
      .select()
      .single();

    if (reviewError) {
      return NextResponse.json({ error: reviewError.message }, { status: 500 });
    }

    // 4. Insert section reviews
    const sectionRows = sections.map((s) => ({
      review_id:          review.id,
      section_key:        s.section_key,
      decision:           s.decision,
      standard_comments:  s.standard_comments,
      custom_comment:     s.custom_comment || null,
    }));

    const { error: sectionError } = await supabase
      .from("section_reviews")
      .insert(sectionRows);

    if (sectionError) {
      return NextResponse.json({ error: sectionError.message }, { status: 500 });
    }

    // 5. Fetch all reviews for this project + round (to check if both reviewers done)
    const { data: allReviews } = await supabase
      .from("reviews")
      .select("id, reviewer_name, reviewer_email, overall_decision, is_editorial")
      .eq("project_id", project_id)
      .eq("round", round);

    const feedbackDocs = await getFeedbackDocs(supabase, project_id, round);

    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", project_id)
      .single();

    if (!project) throw new Error("Project not found");

    // Update status to "reviewing" after first review
    if ((allReviews?.length ?? 0) === 1) {
      await supabase
        .from("projects")
        .update({ status: "reviewing", progress: 60 })
        .eq("id", project_id);
    }

    // 6. Decide outcome: 1 reviewer needed if reviewer2 is null, else 2.
    //    Las decisiones de coordinación no cuentan para este total (cierran la
    //    ronda por su cuenta), pero sí se incluyen en el detalle que se envía.
    const reviewersNeeded = project.reviewer2 ? 2 : 1;
    const reviewerReviews = (allReviews ?? []).filter((r) => !r.is_editorial);

    if (reviewerReviews.length >= reviewersNeeded) {
      const allAccepted = reviewerReviews.every((r) => r.overall_decision === "accepted");

      if (allAccepted) {
        await applyApproval(supabase, project, origin, feedbackDocs);
      } else {
        const corrections = await buildCorrections(supabase, allReviews ?? [], feedbackDocs);
        await applyCorrections(supabase, project, origin, corrections, feedbackDocs);
      }
    } else if (reviewersNeeded === 2 && reviewerReviews.length === 1) {
      // Falta el segundo revisor → avisarle que su co-revisor ya completó.
      const otherName = [project.reviewer, project.reviewer2]
        .find((n) => n && n !== reviewer_name);
      if (otherName) {
        const { data: other } = await supabase
          .from("reviewers")
          .select("email")
          .ilike("name", otherName)
          .limit(1)
          .maybeSingle();
        if (other?.email) {
          await sendEmail(
            other.email,
            `Tu co-revisor ya revisó · ${project.title}`,
            buildReviewerColleagueDoneEmail(
              project, otherName, reviewer_name,
              `${origin}/revisores/review/${project.id}`,
            ),
          ).catch(() => {});
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("Review error:", e);
    const message = e instanceof Error
      ? e.message
      : (typeof e === "object" && e !== null && "message" in e)
        ? String((e as { message: unknown }).message)
        : JSON.stringify(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
