import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import {
  sendEmail,
  buildApprovalEmail,
  buildCorrectionsEmail,
  buildCoordinatorApprovalEmail,
  buildCertRequestEmail,
  ETHICS_COMMITTEE_EMAIL,
} from "@/lib/email";
import { generateCertToken } from "@/app/api/certify/route";
import { sections as allSections } from "@/lib/sections";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { reviewer_name, reviewer_email, origin } = await req.json();
  const supabase = getSupabaseServer();

  const { data: project } = await supabase.from("projects").select("*").eq("id", id).single();
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const round = project.current_round ?? 1;

  // Add this reviewer's confirmation to all sections
  const { data: drafts } = await supabase
    .from("group_review_drafts")
    .select("*")
    .eq("project_id", id)
    .eq("round", round);

  if (!drafts?.length) return NextResponse.json({ error: "Draft no encontrado" }, { status: 404 });

  for (const draft of drafts) {
    const alreadyConfirmed = (draft.confirmed_by ?? []).includes(reviewer_email);
    if (!alreadyConfirmed) {
      await supabase
        .from("group_review_drafts")
        .update({ confirmed_by: [...(draft.confirmed_by ?? []), reviewer_email] })
        .eq("id", draft.id);
    }
  }

  // Re-fetch to get updated confirmed_by
  const { data: updatedDrafts } = await supabase
    .from("group_review_drafts")
    .select("*")
    .eq("project_id", id)
    .eq("round", round);

  // Check if both reviewers confirmed
  const reviewerEmails = [
    project.reviewer ? await getReviewerEmail(project.reviewer, supabase) : null,
    project.reviewer2 ? await getReviewerEmail(project.reviewer2, supabase) : null,
  ].filter(Boolean) as string[];

  const allConfirmed = updatedDrafts?.every((d) =>
    reviewerEmails.every((email) => (d.confirmed_by ?? []).includes(email))
  );

  if (!allConfirmed) {
    return NextResponse.json({ ok: true, status: "waiting" });
  }

  // Both confirmed → determine outcome
  const hasCorrections = updatedDrafts!.some((d) => d.decision === "corrections");
  const overall = hasCorrections ? "corrections" : "accepted";

  // Reviewer-uploaded commented documents for this round (file_name is
  // prefixed with the reviewer's name at upload time)
  const { data: fbRows } = await supabase
    .from("documents")
    .select("file_name, file_path")
    .eq("project_id", id)
    .eq("doc_type", "review_feedback")
    .like("file_path", `%/review-feedback/r${round}/%`);

  const feedbackDocs = (fbRows ?? [])
    .filter((d) => d.file_path)
    .map((d) => ({
      filename: d.file_name,
      url: supabase.storage.from("documents").getPublicUrl(d.file_path!).data.publicUrl,
    }));
  const feedbackAttachments = feedbackDocs.map((d) => ({ filename: d.filename, path: d.url }));

  if (overall === "accepted") {
    await supabase.from("projects").update({ status: "approved", progress: 100 }).eq("id", id);

    await sendEmail(
      project.researcher_email,
      `¡Tu proyecto fue aprobado! · ${project.title}`,
      buildApprovalEmail(project, origin),
      undefined,
      feedbackAttachments,
    );

    const coordinatorEmail = process.env.COORDINATOR_EMAIL;
    if (coordinatorEmail) await sendEmail(coordinatorEmail, `Proyecto aprobado · ${project.title}`, buildCoordinatorApprovalEmail(project));

    const macarenaEmail = process.env.MACARENA_EMAIL;
    if (macarenaEmail) {
      const { html, attachments } = await buildCertRequestEmail(supabase, project, origin, generateCertToken(id));
      await sendEmail(macarenaEmail, `Solicitud certificado de ética · ${project.title}`, html, [project.researcher_email, ETHICS_COMMITTEE_EMAIL], attachments);
    }
  } else {
    await supabase.from("projects").update({ status: "corrections", progress: 40 }).eq("id", id);

    const jointName = [project.reviewer, project.reviewer2].filter(Boolean).join(" y ") || "Comité revisor";
    const correctionsByReviewer: {
      reviewer_name: string;
      sections: { label: string; standardComments: string[]; customComment: string }[];
      feedbackUrl?: string | null;
      feedbackName?: string | null;
    }[] = [
      {
        reviewer_name: jointName,
        sections: updatedDrafts!
          .filter((d) => d.decision === "corrections")
          .map((d) => ({
            label: d.section_key === "general"
              ? "Evaluación general"
              : allSections.find((s) => s.key === d.section_key)?.label ?? d.section_key,
            standardComments: d.standard_comments ?? [],
            customComment: d.custom_comment ?? "",
          })),
      },
    ].filter((r) => r.sections.length > 0);

    // Each reviewer-commented document gets its own block with a download link
    for (const d of feedbackDocs) {
      correctionsByReviewer.push({
        reviewer_name: d.filename.split(" - ")[0],
        sections: [],
        feedbackUrl: d.url,
        feedbackName: d.filename,
      });
    }

    if (correctionsByReviewer.length > 0) {
      await sendEmail(
        project.researcher_email,
        `Tu proyecto tiene observaciones · ${project.title}`,
        buildCorrectionsEmail(project, correctionsByReviewer, origin),
        undefined,
        feedbackAttachments,
      );
    }
  }

  return NextResponse.json({ ok: true, status: "submitted", outcome: overall });
}

async function getReviewerEmail(name: string, supabase: ReturnType<typeof import("@/lib/supabase").getSupabase>) {
  const { data } = await supabase.from("reviewers").select("email").eq("name", name).single();
  return data?.email ?? null;
}
