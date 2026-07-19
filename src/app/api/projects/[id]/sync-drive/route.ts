import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { uploadProjectToDrive } from "@/lib/drive";

// Sin sesión a propósito: el formulario público de /submit lo llama al enviar
// un proyecto, antes de que exista cualquier sesión. Solo copia al Drive del
// comité los documentos del proyecto indicado.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data: project } = await supabase.from("projects").select("*").eq("id", id).single();
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const { data: docs } = await supabase.from("documents").select("*").eq("project_id", id);

  const documents = (docs ?? [])
    .filter(d => d.file_path)
    .map(d => ({
      doc_type:  d.doc_type,
      file_name: d.file_name,
      url: supabase.storage.from("documents").getPublicUrl(d.file_path!).data.publicUrl,
    }));

  try {
    await uploadProjectToDrive(project, documents);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("Drive sync error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
