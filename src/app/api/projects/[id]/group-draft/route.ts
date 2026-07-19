import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { sections } from "@/lib/sections";
import { requireStaff } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireStaff(req);
  if (response) return response;

  const { id } = await params;
  const round = Number(req.nextUrl.searchParams.get("round") ?? "1");
  const supabase = getSupabaseServer();

  const { data: existing } = await supabase
    .from("group_review_drafts")
    .select("*")
    .eq("project_id", id)
    .eq("round", round);

  // Initialize missing sections (first load, or after new sections were added
  // to the pauta). "general" is the pseudo-section used by the
  // commented-document system for the overall decision.
  const have = new Set((existing ?? []).map((e) => e.section_key));
  const missingRows = [...sections.map((s) => s.key), "general"]
    .filter((key) => !have.has(key))
    .map((key) => ({
      project_id: id,
      round,
      section_key: key,
      decision: "accepted",
      standard_comments: [],
      custom_comment: "",
      confirmed_by: [],
    }));

  if (missingRows.length) {
    const { data: inserted, error } = await supabase
      .from("group_review_drafts")
      .upsert(missingRows, { onConflict: "project_id,round,section_key" })
      .select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json([...(existing ?? []), ...(inserted ?? missingRows)]);
  }

  return NextResponse.json(existing);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireStaff(req);
  if (response) return response;

  const { id } = await params;
  const { round, section_key, decision, standard_comments, custom_comment } = await req.json();
  const supabase = getSupabaseServer();

  const { error } = await supabase
    .from("group_review_drafts")
    .update({ decision, standard_comments, custom_comment, updated_at: new Date().toISOString() })
    .eq("project_id", id)
    .eq("round", round)
    .eq("section_key", section_key);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
