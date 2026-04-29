import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const email = req.cookies.get("investigador_email")?.value;

  if (!email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, title, status, progress, tracking_code, current_round, created_at, project_type, theme, researcher_name, reviewer, reviewer2, advisor_name, funding_type, funding_folio, funding_detail")
    .eq("researcher_email", email)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ projects: projects ?? [], email });
}
