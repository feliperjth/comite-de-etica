import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getSupabaseAdmin } from "@/lib/supabase";

// Canonical display order; unknown types go last, then by upload date
const DOC_ORDER = ["protocol", "consent", "assent", "instruments", "revision"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const email =
    req.cookies.get("comite_email")?.value ||
    req.cookies.get("reviewer_email")?.value ||
    req.cookies.get("investigador_email")?.value;

  if (!email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  // Prefer the service-role client so reviewers/comité always see every
  // document regardless of RLS; fall back to anon if the key isn't set.
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    supabase = getSupabase();
  }

  const { data: docs, error } = await supabase
    .from("documents")
    .select("*")
    .eq("project_id", id)
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
