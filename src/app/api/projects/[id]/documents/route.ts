import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const email =
    req.cookies.get("comite_email")?.value ||
    req.cookies.get("investigador_email")?.value;

  if (!email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabase();

  const { data: docs, error } = await supabase
    .from("documents")
    .select("*")
    .eq("project_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = (docs ?? [])
    .filter((d) => d.file_path)
    .map((d) => {
      const { data } = supabase.storage
        .from("documents")
        .getPublicUrl(d.file_path!);
      return {
        id:        d.id,
        doc_type:  d.doc_type,
        file_name: d.file_name,
        url:       data.publicUrl,
      };
    });

  return NextResponse.json({ documents: result });
}
