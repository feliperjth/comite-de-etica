import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";
import { sendEmail, buildRejectedEmail } from "@/lib/email";
import { applyApproval, applyCorrections, getFeedbackDocs } from "@/lib/outcome";

/**
 * Cierre de etapa por la coordinación ("editor jefe").
 *
 * Permite resolver una ronda en nombre de los revisores —por ejemplo subiendo
 * el documento que ellos prepararon— sin ocupar su cupo: `reviewer` y
 * `reviewer2` no se tocan y siguen a cargo en las rondas siguientes.
 *
 * La decisión se guarda en `reviews` con `is_editorial = true`, así el
 * investigador la ve igual que cualquier corrección, pero no cuenta para el
 * cierre automático por número de revisiones (ver src/lib/outcome.ts).
 */

const COORDINATION_NAME = "Coordinación del Comité";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, response } = await requireAdmin(req);
  if (response) return response;

  const { id } = await params;
  const {
    decision,
    comment,
    origin,
  }: {
    decision: "corrections" | "approved" | "rejected";
    comment: string;
    origin: string;
  } = await req.json();

  if (!["corrections", "approved", "rejected"].includes(decision)) {
    return NextResponse.json({ error: "Decisión inválida." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const round = project.current_round ?? 1;
  const trimmed = (comment ?? "").trim();

  // El documento ya fue subido por el cliente a documents/review_feedback.
  const feedbackDocs = await getFeedbackDocs(supabase, id, round);

  if (decision === "rejected") {
    await supabase
      .from("projects")
      .update({ status: "rejected", progress: 100, decided_at: new Date().toISOString() })
      .eq("id", id);

    if (project.researcher_email) {
      await sendEmail(
        project.researcher_email,
        `Resultado de tu proyecto · ${project.title}`,
        buildRejectedEmail(project, trimmed),
      ).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  }

  // Se exige contenido: sin comentario ni documento el investigador no
  // recibiría nada accionable.
  if (decision === "corrections" && !trimmed && feedbackDocs.length === 0) {
    return NextResponse.json(
      { error: "Escribe un comentario o adjunta un documento para enviar las observaciones." },
      { status: 400 },
    );
  }

  const overall_decision = decision === "approved" ? "accepted" : "corrections";

  const { data: review, error: reviewError } = await supabase
    .from("reviews")
    .insert({
      project_id: id,
      reviewer_name: COORDINATION_NAME,
      reviewer_email: session.email,
      round,
      overall_decision,
      is_editorial: true,
    })
    .select()
    .single();

  if (reviewError) {
    return NextResponse.json({ error: reviewError.message }, { status: 500 });
  }

  const { error: sectionError } = await supabase.from("section_reviews").insert({
    review_id: review.id,
    section_key: "general",
    decision: overall_decision,
    standard_comments: [],
    custom_comment: trimmed || null,
  });

  if (sectionError) {
    return NextResponse.json({ error: sectionError.message }, { status: 500 });
  }

  if (decision === "approved") {
    await applyApproval(supabase, project, origin, feedbackDocs);
  } else {
    // El detalle se arma aquí en vez de con buildCorrections(): esa función
    // atribuye cada documento comparando el prefijo del nombre de archivo con
    // el del firmante, y los documentos de la ronda los subieron los revisores
    // con SU nombre, no el de coordinación. Al no cruzar, la entrada quedaba
    // vacía y el correo no se enviaba pese a haber cambiado el estado.
    // Al cerrar una etapa, todos los documentos de la ronda son los que se
    // envían, vengan de quien vengan.
    const corrections = [
      {
        reviewer_name: COORDINATION_NAME,
        sections: trimmed
          ? [{ label: "Evaluación general", standardComments: [], customComment: trimmed }]
          : [],
        feedbackUrl: feedbackDocs[0]?.url ?? null,
        feedbackName: feedbackDocs[0]?.filename ?? null,
      },
      // Un bloque por cada documento adicional, con su enlace de descarga.
      ...feedbackDocs.slice(1).map((d) => ({
        reviewer_name: d.filename.split(" - ")[0],
        sections: [],
        feedbackUrl: d.url,
        feedbackName: d.filename,
      })),
    ];

    await applyCorrections(supabase, project, origin, corrections, feedbackDocs);
  }

  return NextResponse.json({ ok: true });
}
