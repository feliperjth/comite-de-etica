import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const investigadorEmail = req.cookies.get("investigador_email")?.value;
  const comiteEmail       = req.cookies.get("comite_email")?.value;

  if (!investigadorEmail && !comiteEmail) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = getSupabase();
  const select = "id, title, status, progress, tracking_code, current_round, created_at, project_type, theme, researcher_name, reviewer, reviewer2, advisor_name, funding_type, funding_folio, funding_detail, certificate_url";

  let query = supabase.from("projects").select(select).order("created_at", { ascending: false });

  // Coordinators (comite) see all projects; investigators see only their own
  if (investigadorEmail) {
    query = query.eq("researcher_email", investigadorEmail);
  }

  const { data: projects, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ projects: projects ?? [], email: investigadorEmail ?? comiteEmail });
}
