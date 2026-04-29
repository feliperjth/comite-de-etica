import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const email = req.cookies.get("comite_email")?.value;
  const name  = req.cookies.get("comite_name")?.value;

  if (!email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = getSupabase();

  // Reviews submitted by this member
  const { data: reviews, error: reviewError } = await supabase
    .from("reviews")
    .select("id, project_id, round, overall_decision, submitted_at")
    .eq("reviewer_email", email)
    .order("submitted_at", { ascending: false });

  if (reviewError) {
    return NextResponse.json({ error: reviewError.message }, { status: 500 });
  }

  // Project details for each reviewed project
  const projectIds = [...new Set((reviews ?? []).map((r) => r.project_id))];
  let projects: Record<string, unknown>[] = [];
  if (projectIds.length > 0) {
    const { data } = await supabase
      .from("projects")
      .select("id, title, status, tracking_code, researcher_name, current_round, reviewer, reviewer2")
      .in("id", projectIds);
    projects = data ?? [];
  }

  // Derive reviewer name from past reviews if comite_name cookie is missing
  let resolvedName = name ?? "";
  if (!resolvedName && (reviews ?? []).length > 0) {
    const { data: anyReview } = await supabase
      .from("reviews")
      .select("reviewer_name")
      .eq("reviewer_email", email)
      .limit(1)
      .maybeSingle();
    resolvedName = anyReview?.reviewer_name ?? "";
  }

  // Active projects assigned to this reviewer (matched by name)
  let assignedProjects: Record<string, unknown>[] = [];
  if (resolvedName) {
    const { data } = await supabase
      .from("projects")
      .select("id, title, status, tracking_code, researcher_name, current_round, reviewer, reviewer2, progress")
      .or(`reviewer.ilike.${resolvedName},reviewer2.ilike.${resolvedName}`)
      .in("status", ["submitted", "reviewing", "corrections"]);
    assignedProjects = data ?? [];
  }

  return NextResponse.json({
    reviews:          reviews ?? [],
    projects,
    assignedProjects,
    email,
    name: name ?? "",
  });
}
