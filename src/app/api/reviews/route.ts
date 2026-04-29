import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { sections as allSections } from "@/lib/sections";
import {
  sendEmail,
  buildApprovalEmail,
  buildCorrectionsEmail,
  buildCoordinatorApprovalEmail,
  buildMacarenaEmail,
} from "@/lib/email";
import { generateCertToken } from "@/app/api/certify/route";

interface SectionPayload {
  section_key: string;
  decision: "accepted" | "corrections";
  standard_comments: string[];
  custom_comment: string;
}

export async function POST(req: Request) {
  try {
    const {
      project_id,
      reviewer_name,
      reviewer_email,
      round,
      origin,
      sections,
    }: {
      project_id: string;
      reviewer_name: string;
      reviewer_email: string;
      round: number;
      origin: string;
      sections: SectionPayload[];
    } = await req.json();

    const supabase = getSupabase();

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
      .select("id, reviewer_name, reviewer_email, overall_decision")
      .eq("project_id", project_id)
      .eq("round", round);

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

    // 6. Decide outcome: 1 reviewer needed if reviewer2 is null, else 2
    const reviewersNeeded = project.reviewer2 ? 2 : 1;
    if ((allReviews?.length ?? 0) >= reviewersNeeded) {
      const bothAccepted = allReviews!.every((r) => r.overall_decision === "accepted");

      if (bothAccepted) {
        // ── APPROVED ──
        await supabase
          .from("projects")
          .update({ status: "approved", progress: 100 })
          .eq("id", project_id);

        // Email to researcher
        await sendEmail(
          project.researcher_email,
          `¡Tu proyecto fue aprobado! · ${project.title}`,
          buildApprovalEmail(project, origin),
        );

        // Email to coordinator
        const coordinatorEmail = process.env.COORDINATOR_EMAIL;
        if (coordinatorEmail) {
          await sendEmail(
            coordinatorEmail,
            `Proyecto aprobado · ${project.title}`,
            buildCoordinatorApprovalEmail(project),
          );
        }

        // Email a Macarena solicitando carta de ética (con copia al investigador)
        const macarenaEmail = process.env.MACARENA_EMAIL;
        if (macarenaEmail) {
          const certToken = generateCertToken(project.id);
          await sendEmail(
            macarenaEmail,
            `Solicitud certificado de ética · ${project.title}`,
            buildMacarenaEmail(project, origin, certToken),
            project.researcher_email,
          );
        }
      } else {
        // ── CORRECTIONS ──
        await supabase
          .from("projects")
          .update({ status: "corrections", progress: 40 })
          .eq("id", project_id);

        // Fetch section_reviews for all reviews in this round
        const { data: sectionReviews } = await supabase
          .from("section_reviews")
          .select("review_id, section_key, decision, standard_comments, custom_comment")
          .in("review_id", allReviews!.map((r) => r.id));

        // Build corrections grouped by reviewer
        const correctionsByReviewer = allReviews!
          .filter((r) => r.overall_decision === "corrections")
          .map((r) => {
            const mySections = (sectionReviews ?? [])
              .filter((sr) => sr.review_id === r.id && sr.decision === "corrections")
              .map((sr) => ({
                label: allSections.find((s) => s.key === sr.section_key)?.label ?? sr.section_key,
                standardComments: sr.standard_comments ?? [],
                customComment: sr.custom_comment ?? "",
              }));
            return { reviewer_name: r.reviewer_name, sections: mySections };
          })
          .filter((r) => r.sections.length > 0);

        if (correctionsByReviewer.length > 0) {
          await sendEmail(
            project.researcher_email,
            `Tu proyecto tiene observaciones · ${project.title}`,
            buildCorrectionsEmail(project, correctionsByReviewer, origin),
          );
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
