import type { SupabaseClient } from "@supabase/supabase-js";
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

/**
 * Cierre de una ronda de revisión.
 *
 * Lo usan dos caminos que deben producir exactamente el mismo resultado:
 * el envío de un revisor (`/api/reviews`) y el cierre que hace la coordinación
 * en nombre de los revisores (`/api/projects/[id]/close-stage`).
 */

export type FeedbackDoc = { filename: string; url: string };

export type CorrectionsByReviewer = {
  reviewer_name: string;
  sections: { label: string; standardComments: string[]; customComment: string }[];
  feedbackUrl: string | null;
  feedbackName: string | null;
};

/** "general" es la pseudo-sección del modo documento comentado. */
export function sectionLabel(key: string) {
  if (key === "general") return "Evaluación general";
  return allSections.find((s) => s.key === key)?.label ?? key;
}

/** Documentos comentados subidos para esta ronda, con URL pública. */
export async function getFeedbackDocs(
  supabase: SupabaseClient,
  projectId: string,
  round: number,
): Promise<FeedbackDoc[]> {
  const { data } = await supabase
    .from("documents")
    .select("file_name, file_path")
    .eq("project_id", projectId)
    .eq("doc_type", "review_feedback")
    .like("file_path", `%/review-feedback/r${round}/%`);

  return (data ?? [])
    .filter((d) => d.file_path)
    .map((d) => ({
      filename: d.file_name,
      url: supabase.storage.from("documents").getPublicUrl(d.file_path!).data.publicUrl,
    }));
}

/** Aprueba el proyecto y envía los correos (investigador, coordinación, Macarena). */
export async function applyApproval(
  supabase: SupabaseClient,
  project: Record<string, string>,
  origin: string,
  feedbackDocs: FeedbackDoc[],
) {
  await supabase
    .from("projects")
    .update({ status: "approved", progress: 100, decided_at: new Date().toISOString() })
    .eq("id", project.id);

  await sendEmail(
    project.researcher_email,
    `¡Tu proyecto fue aprobado! · ${project.title}`,
    buildApprovalEmail(project as never, origin),
    undefined,
    feedbackDocs.map((d) => ({ filename: d.filename, path: d.url })),
  );

  const coordinatorEmail = process.env.COORDINATOR_EMAIL;
  if (coordinatorEmail) {
    await sendEmail(
      coordinatorEmail,
      `Proyecto aprobado · ${project.title}`,
      buildCoordinatorApprovalEmail(project as never),
    );
  }

  const macarenaEmail = process.env.MACARENA_EMAIL;
  if (macarenaEmail) {
    const certToken = generateCertToken(project.id);
    const { html, attachments } = await buildCertRequestEmail(supabase, project as never, origin, certToken);
    await sendEmail(
      macarenaEmail,
      `Solicitud certificado de ética · ${project.title}`,
      html,
      [project.researcher_email, ETHICS_COMMITTEE_EMAIL],
      attachments,
    );
  }
}

/** Pasa el proyecto a "con observaciones" y envía el detalle al investigador. */
export async function applyCorrections(
  supabase: SupabaseClient,
  project: Record<string, string>,
  origin: string,
  correctionsByReviewer: CorrectionsByReviewer[],
  feedbackDocs: FeedbackDoc[],
) {
  await supabase
    .from("projects")
    .update({ status: "corrections", progress: 40 })
    .eq("id", project.id);

  if (correctionsByReviewer.length === 0) return;

  await sendEmail(
    project.researcher_email,
    `Tu proyecto tiene observaciones · ${project.title}`,
    buildCorrectionsEmail(project as never, correctionsByReviewer, origin),
    undefined,
    feedbackDocs.map((d) => ({ filename: d.filename, path: d.url })),
  );
}

/**
 * Arma el detalle de correcciones a partir de las revisiones de la ronda.
 * El documento comentado se atribuye por el prefijo del nombre de archivo.
 */
export async function buildCorrections(
  supabase: SupabaseClient,
  reviews: { id: string; reviewer_name: string; overall_decision: string }[],
  feedbackDocs: FeedbackDoc[],
): Promise<CorrectionsByReviewer[]> {
  const withCorrections = reviews.filter((r) => r.overall_decision === "corrections");
  if (withCorrections.length === 0) return [];

  const { data: sectionReviews } = await supabase
    .from("section_reviews")
    .select("review_id, section_key, decision, standard_comments, custom_comment")
    .in("review_id", reviews.map((r) => r.id));

  return withCorrections
    .map((r) => {
      const mySections = (sectionReviews ?? [])
        .filter((sr) => sr.review_id === r.id && sr.decision === "corrections")
        .map((sr) => ({
          label: sectionLabel(sr.section_key),
          standardComments: sr.standard_comments ?? [],
          customComment: sr.custom_comment ?? "",
        }))
        .filter((s) => s.standardComments.length > 0 || s.customComment);
      const myDoc = feedbackDocs.find((d) => d.filename.startsWith(r.reviewer_name));
      return {
        reviewer_name: r.reviewer_name,
        sections: mySections,
        feedbackUrl: myDoc?.url ?? null,
        feedbackName: myDoc?.filename ?? null,
      };
    })
    .filter((r) => r.sections.length > 0 || r.feedbackUrl);
}
