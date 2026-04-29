import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { sections } from "@/lib/sections";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const round = Number(req.nextUrl.searchParams.get("round") ?? "1");
  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from("group_review_drafts")
    .select("*")
    .eq("project_id", id)
    .eq("round", round);

  // Initialize missing sections
  if (!existing?.length) {
    const rows = sections.map((s) => ({
      project_id: id,
      round,
      section_key: s.key,
      decision: "accepted",
      standard_comments: [],
      custom_comment: "",
      confirmed_by: [],
    }));
    await supabase.from("group_review_drafts").upsert(rows, { onConflict: "project_id,round,section_key" });
    return NextResponse.json(rows);
  }

  return NextResponse.json(existing);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { round, section_key, decision, standard_comments, custom_comment } = await req.json();
  const supabase = getSupabase();

  const { error } = await supabase
    .from("group_review_drafts")
    .update({ decision, standard_comments, custom_comment, updated_at: new Date().toISOString() })
    .eq("project_id", id)
    .eq("round", round)
    .eq("section_key", section_key);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
