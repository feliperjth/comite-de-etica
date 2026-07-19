import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { canAccessProject, getSession } from "@/lib/auth";

// Canonical display order; unknown types go last, then by upload date
const DOC_ORDER = ["protocol", "consent", "assent", "instruments", "revision"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  // Service-role client so reviewers/comité always see every document
  // regardless of RLS; falls back to anon if the key isn't set.
  const supabase = getSupabaseServer();

  // Un investigador solo puede ver los documentos de sus propios proyectos.
  const { data: project } = await supabase
    .from("projects")
    .select("researcher_email")
    .eq("id", id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  if (!canAccessProject(session, project)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { data: docs, error } = await supabase
    .from("documents")
    .select("*")
    .eq("project_id", id)
    .neq("doc_type", "review_feedback") // reviewer→researcher docs live elsewhere
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = (docs ?? [])
    .map((d) => {
      let url: string | null = null;
      if (d.file_path) {
        const { data } = supabase.storage
          .from("documents")
          .getPublicUrl(d.file_path);
        url = data.publicUrl;
      }
      return {
        id:        d.id,
        doc_type:  d.doc_type,
        file_name: d.file_name,
        url,
      };
    })
    .sort((a, b) => {
      const ia = DOC_ORDER.indexOf(a.doc_type);
      const ib = DOC_ORDER.indexOf(b.doc_type);
      return (ia === -1 ? DOC_ORDER.length : ia) - (ib === -1 ? DOC_ORDER.length : ib);
    });

  return NextResponse.json({ documents: result });
}
