import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { requireStaff } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { response } = await requireStaff(req);
  if (response) return response;

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Proyectos con alguna subida fallida (documento sin archivo). Va aquí para
  // que el dashboard no tenga que consultar `documents` desde el navegador.
  const { data: faltantes } = await supabase
    .from("documents")
    .select("project_id")
    .is("file_path", null)
    .neq("doc_type", "review_feedback");

  return NextResponse.json({
    projects: data ?? [],
    missingDocs: [...new Set((faltantes ?? []).map((d) => d.project_id))],
  });
}
