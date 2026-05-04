import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const ADMIN_EMAIL = "felipe.rojast@uai.cl";

function isAdmin(req: NextRequest) {
  return req.cookies.get("comite_email")?.value?.toLowerCase() === ADMIN_EMAIL;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const supabase = getSupabaseAdmin();

  const [
    { data: accounts },
    { data: allProjects },
    { data: reviewers },
    { data: reviews },
  ] = await Promise.all([
    supabase
      .from("researcher_accounts")
      .select("id, name, email, created_at")
      .order("name"),
    supabase
      .from("projects")
      .select("id, title, status, project_type, theme, researcher_email, researcher_name, reviewer, reviewer2, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("reviewers")
      .select("id, name, email, expertise, created_at")
      .order("name"),
    supabase
      .from("reviews")
      .select("reviewer_name, reviewer_email, project_id, round, overall_decision, submitted_at"),
  ]);

  // Group projects by researcher email
  const projectsByEmail: Record<string, typeof allProjects> = {};
  for (const p of allProjects ?? []) {
    if (!projectsByEmail[p.researcher_email]) projectsByEmail[p.researcher_email] = [];
    projectsByEmail[p.researcher_email]!.push(p);
  }

  // Group reviews by reviewer name
  const reviewsByName: Record<string, typeof reviews> = {};
  for (const r of reviews ?? []) {
    if (!reviewsByName[r.reviewer_name]) reviewsByName[r.reviewer_name] = [];
    reviewsByName[r.reviewer_name]!.push(r);
  }

  // Group assigned projects by reviewer name
  const assignedByName: Record<string, typeof allProjects> = {};
  for (const p of allProjects ?? []) {
    for (const rname of [p.reviewer, p.reviewer2].filter(Boolean) as string[]) {
      if (!assignedByName[rname]) assignedByName[rname] = [];
      assignedByName[rname]!.push(p);
    }
  }

  const researchers = (accounts ?? []).map(a => ({
    id: a.id,
    name: a.name,
    email: a.email,
    created_at: a.created_at,
    projects: (projectsByEmail[a.email] ?? []).map(p => ({
      id: p.id, title: p.title, status: p.status,
      project_type: p.project_type, theme: p.theme, created_at: p.created_at,
    })),
  }));

  const reviewerList = (reviewers ?? []).map(r => ({
    id: r.id,
    name: r.name,
    email: r.email,
    expertise: r.expertise,
    created_at: r.created_at,
    assigned: (assignedByName[r.name] ?? []).map(p => ({
      id: p.id, title: p.title, status: p.status,
      project_type: p.project_type, theme: p.theme,
    })),
    reviews_submitted: (reviewsByName[r.name] ?? []).length,
  }));

  return NextResponse.json({ researchers, reviewers: reviewerList });
}
