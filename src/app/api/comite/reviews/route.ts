import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { requireStaff } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { session, response } = await requireStaff(req);
  if (response) return response;

  const email = session.email;
  const name  = session.name;

  const supabase = getSupabaseServer();

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
      .select("id, title, status, tracking_code, researcher_name, current_round, reviewer, reviewer2, certificate_url")
      .in("id", projectIds);
    projects = data ?? [];
  }

  // Resolve name: cookie → reviewers table → reviews table
  let resolvedName = name ?? "";
  if (!resolvedName) {
    const { data: reviewer } = await supabase
      .from("reviewers")
      .select("name")
      .eq("email", email)
      .maybeSingle();
    resolvedName = reviewer?.name ?? "";
  }
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
      .select("id, title, status, tracking_code, researcher_name, current_round, reviewer, reviewer2, progress, certificate_url")
      .or(`reviewer.ilike.${resolvedName},reviewer2.ilike.${resolvedName}`)
      .in("status", ["submitted", "reviewing", "corrections"]);
    assignedProjects = data ?? [];
  }

  return NextResponse.json({
    reviews:          reviews ?? [],
    projects,
    assignedProjects,
    email,
    name: resolvedName,
  });
}
