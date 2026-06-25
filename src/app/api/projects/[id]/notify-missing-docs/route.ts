import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { sendEmail, buildMissingDocsEmail } from "@/lib/email";
import { docLabel } from "@/lib/documents";

/**
 * Avisa por correo al investigador que su proyecto tiene documentos faltantes
 * (file_path nulo → "Archivo no disponible") con el enlace de seguimiento para
 * re-subirlos. Lo dispara el comité desde el dashboard, o automáticamente el
 * flujo de envío cuando una subida falla.
 *
 * Autorización: sesión de comité/revisor, o el código de seguimiento del
 * proyecto en el cuerpo (lo conoce el cliente que acaba de enviar).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const code: string | undefined = body?.code;

  const hasCommitteeCookie =
    !!req.cookies.get("comite_email")?.value || !!req.cookies.get("reviewer_email")?.value;

  const supabase = getSupabaseServer();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, researcher_name, researcher_email, tracking_code")
    .eq("id", id)
    .single();
  if (!project) {
    return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
  }

  const authorized =
    hasCommitteeCookie || (!!code && project.tracking_code === code.toUpperCase());
  if (!authorized) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  if (!project.researcher_email) {
    return NextResponse.json({ error: "El proyecto no tiene correo de investigador." }, { status: 400 });
  }

  // Documentos del proyecto que quedaron sin archivo.
  const { data: docs } = await supabase
    .from("documents")
    .select("doc_type, file_path")
    .eq("project_id", id)
    .is("file_path", null)
    .neq("doc_type", "review_feedback");

  const missing = docs ?? [];
  if (missing.length === 0) {
    return NextResponse.json({ ok: true, sent: false, count: 0 });
  }

  const labels = Array.from(new Set(missing.map((d) => docLabel(d.doc_type))));

  const origin =
    req.headers.get("origin") ??
    (req.headers.get("referer") ?? "").match(/^(https?:\/\/[^/]+)/)?.[1] ??
    "";

  await sendEmail(
    project.researcher_email,
    `Faltan documentos en tu proyecto · ${project.title}`,
    buildMissingDocsEmail(project, labels, origin),
  );

  return NextResponse.json({
    ok: true,
    sent: true,
    count: missing.length,
    to: project.researcher_email,
  });
}
