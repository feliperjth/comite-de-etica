import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const ADMIN_EMAIL = "felipe.rojast@uai.cl";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const email = req.cookies.get("comite_email")?.value;

  if (!email || email.toLowerCase() !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const supabase = getSupabase();

  // Delete related records first
  await supabase.from("section_reviews").delete().in(
    "review_id",
    (await supabase.from("reviews").select("id").eq("project_id", id)).data?.map((r) => r.id) ?? []
  );
  await supabase.from("reviews").delete().eq("project_id", id);
  await supabase.from("documents").delete().eq("project_id", id);
  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
