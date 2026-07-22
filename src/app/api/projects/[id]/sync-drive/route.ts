import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { uploadProjectToDrive } from "@/lib/drive";

// Sin sesión a propósito: el formulario público de /submit lo llama al enviar
// un proyecto, antes de que exista cualquier sesión. Solo copia al Drive del
// comité los documentos del proyecto indicado.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseServer();

  const { data: project } = await supabase.from("projects").select("*").eq("id", id).single();
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  // Orden cronológico: cuando hay varias rondas del mismo tipo de documento,
  // la numeración que les pone drive.ts tiene que seguir el orden real.
  const { data: docs } = await supabase
    .from("documents")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: true });

  const documents = (docs ?? [])
    .filter(d => d.file_path)
    .map(d => ({
      doc_type:   d.doc_type,
      file_name:  d.file_name,
      created_at: d.created_at,
      url: supabase.storage.from("documents").getPublicUrl(d.file_path!).data.publicUrl,
    }));

  try {
    const result = await uploadProjectToDrive(project, documents);

    // No fingir éxito: si Drive no está configurado, o si no se subió nada
    // habiendo algo que subir, el llamador tiene que ver un error de verdad.
    if (!result.configured) {
      return NextResponse.json(
        { error: "Google Drive no está configurado en este entorno", ...result },
        { status: 503 },
      );
    }
    if (result.uploaded === 0 && result.errors.length > 0) {
      return NextResponse.json(
        { error: result.errors[0], ...result },
        { status: 502 },
      );
    }

    // Éxito total o parcial: 200, pero con el detalle de lo que falló.
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    console.error("Drive sync error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
