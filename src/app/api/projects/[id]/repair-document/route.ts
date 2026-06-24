import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";

/**
 * Registra el archivo de un documento que se había quedado sin `file_path`
 * (subida fallida en el envío original → "Archivo no disponible"). El archivo
 * ya fue subido a Storage por el cliente; aquí solo se actualiza la fila.
 *
 * Autorización: el `code` (código de seguimiento CE-XXXXXX) debe coincidir con
 * el proyecto dueño del documento. Solo se permite reparar documentos que
 * estén realmente faltantes (file_path nulo).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const { code, docId, fileName, filePath } = body as {
    code?: string; docId?: string; fileName?: string; filePath?: string;
  };
  if (!code || !docId || !filePath) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  // Autorizar: el código de seguimiento debe ser el del proyecto.
  const { data: project } = await supabase
    .from("projects")
    .select("id, tracking_code")
    .eq("id", id)
    .single();
  if (!project || project.tracking_code !== code.toUpperCase()) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Solo reparar un documento de este proyecto que esté faltante.
  const { data: doc } = await supabase
    .from("documents")
    .select("id, file_path")
    .eq("id", docId)
    .eq("project_id", id)
    .single();
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  if (doc.file_path) {
    return NextResponse.json({ error: "El documento ya tiene archivo" }, { status: 409 });
  }

  const { error } = await supabase
    .from("documents")
    .update({ file_path: filePath, ...(fileName ? { file_name: fileName } : {}) })
    .eq("id", docId)
    .eq("project_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
