import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const ADMIN_EMAIL = "felipe.rojast@uai.cl";

function isAdmin(req: NextRequest) {
  const email = req.cookies.get("comite_email")?.value
             ?? req.cookies.get("reviewer_email")?.value;
  return email?.toLowerCase() === ADMIN_EMAIL;
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

  // Build researcher map from PROJECTS (all researchers, with or without account)
  const researcherMap: Record<string, {
    id: string; name: string; email: string; created_at: string | null; hasAccount: boolean;
    projects: { id: string; title: string; status: string; project_type: string; theme: string; created_at: string }[];
  }> = {};

  for (const p of allProjects ?? []) {
    if (!researcherMap[p.researcher_email]) {
      researcherMap[p.researcher_email] = {
        id: p.researcher_email,
        name: p.researcher_name,
        email: p.researcher_email,
        created_at: p.created_at,
        hasAccount: false,
        projects: [],
      };
    }
    researcherMap[p.researcher_email].projects.push({
      id: p.id, title: p.title, status: p.status,
      project_type: p.project_type, theme: p.theme, created_at: p.created_at,
    });
  }

  // Overlay with account data where available
  for (const a of accounts ?? []) {
    if (researcherMap[a.email]) {
      researcherMap[a.email].id         = a.id;
      researcherMap[a.email].created_at = a.created_at;
      researcherMap[a.email].hasAccount = true;
    } else {
      // Account exists but no projects submitted yet
      researcherMap[a.email] = {
        id: a.id, name: a.name, email: a.email,
        created_at: a.created_at, hasAccount: true, projects: [],
      };
    }
  }

  const researchers = Object.values(researcherMap).sort((a, b) => a.name.localeCompare(b.name));

  // Group reviews by reviewer name
  const reviewsByName: Record<string, number> = {};
  for (const r of reviews ?? []) {
    reviewsByName[r.reviewer_name] = (reviewsByName[r.reviewer_name] ?? 0) + 1;
  }

  // Group assigned projects by reviewer name
  const assignedByName: Record<string, typeof allProjects> = {};
  for (const p of allProjects ?? []) {
    for (const rname of [p.reviewer, p.reviewer2].filter(Boolean) as string[]) {
      if (!assignedByName[rname]) assignedByName[rname] = [];
      assignedByName[rname]!.push(p);
    }
  }

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
    reviews_submitted: reviewsByName[r.name] ?? 0,
  }));

  return NextResponse.json({ researchers, reviewers: reviewerList });
}
