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
import { aproboAntesDe, evaluarCierre, mismoNombre } from "@/lib/rounds";

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
    .select("project_id, round, overall_decision")
    .eq("reviewer_name", reviewer_name)
    .or("is_editorial.is.null,is_editorial.eq.false");

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

    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", project_id)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
    }

    // La ronda la manda el proyecto, no el navegador: así una pestaña abierta
    // desde la ronda anterior no puede firmar en una ronda que ya se cerró.
    const currentRound = project.current_round ?? 1;
    if (round !== currentRound) {
      return NextResponse.json(
        { error: `Este proyecto ya está en la ronda ${currentRound}. Recarga la página para revisar la ronda actual.` },
        { status: 409 },
      );
    }

    // 1. Revisiones previas del proyecto: ¿ya revisó esta ronda o ya aprobó antes?
    const { data: previas } = await supabase
      .from("reviews")
      .select("reviewer_name, round, overall_decision, is_editorial")
      .eq("project_id", project_id);

    if ((previas ?? []).some((r) => !r.is_editorial && r.round === round && mismoNombre(r.reviewer_name, reviewer_name))) {
      return NextResponse.json({ error: "Ya enviaste tu revisión para esta ronda." }, { status: 400 });
    }

    const rondaAprobada = aproboAntesDe(previas ?? [], reviewer_name, round);
    if (rondaAprobada !== null) {
      return NextResponse.json(
        { error: `Ya aprobaste este proyecto en la ronda ${rondaAprobada}; tu aprobación se mantiene y no necesitas volver a revisarlo.` },
        { status: 400 },
      );
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

    // 5. Todas las revisiones del proyecto (todas las rondas): las aprobaciones
    //    de rondas anteriores cuentan para el cierre de esta.
    const { data: allProjectReviews } = await supabase
      .from("reviews")
      .select("id, reviewer_name, reviewer_email, overall_decision, is_editorial, round")
      .eq("project_id", project_id);

    const roundReviews = (allProjectReviews ?? []).filter((r) => r.round === round);
    const feedbackDocs = await getFeedbackDocs(supabase, project_id, round);

    // Primera revisión de la ronda → "en revisión".
    if (roundReviews.filter((r) => !r.is_editorial).length === 1) {
      await supabase
        .from("projects")
        .update({ status: "reviewing", progress: 60 })
        .eq("id", project_id);
    }

    // 6. ¿Se cierra la ronda? Solo cuentan los revisores que aún no habían
    //    aprobado. Las decisiones de coordinación cierran la ronda por su cuenta
    //    (close-stage), pero sí se incluyen en el detalle que se envía.
    const cierre = evaluarCierre(project, allProjectReviews ?? [], round);

    if (cierre.cerrada) {
      if (cierre.aprobado) {
        await applyApproval(supabase, project, origin, feedbackDocs);
      } else {
        const corrections = await buildCorrections(supabase, roundReviews, feedbackDocs);
        await applyCorrections(supabase, project, origin, corrections, feedbackDocs);
      }
    } else {
      // Avisar a quien falta que su co-revisor ya entregó.
      for (const otherName of cierre.pendientes) {
        if (mismoNombre(otherName, reviewer_name)) continue;
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
