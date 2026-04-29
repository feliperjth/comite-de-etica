import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { numReviewers, mode } = await req.json() as { numReviewers: 1 | 2; mode: "individual" | "group" };
  const supabase = getSupabase();

  // 1. Get project
  const { data: project } = await supabase
    .from("projects")
    .select("id, theme, reviewer, reviewer2")
    .eq("id", id)
    .single();
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  // 2. Get all reviewers with expertise
  const { data: reviewers } = await supabase
    .from("reviewers")
    .select("id, name, email, expertise");
  if (!reviewers?.length)
    return NextResponse.json({ error: "No hay revisores registrados con áreas de experticia" }, { status: 400 });

  // 3. Count active projects per reviewer (submitted | reviewing | corrections)
  const { data: activeProjects } = await supabase
    .from("projects")
    .select("reviewer, reviewer2")
    .in("status", ["submitted", "reviewing", "corrections"]);

  const activeCount: Record<string, number> = {};
  for (const p of activeProjects ?? []) {
    if (p.reviewer)  activeCount[p.reviewer]  = (activeCount[p.reviewer]  ?? 0) + 1;
    if (p.reviewer2) activeCount[p.reviewer2] = (activeCount[p.reviewer2] ?? 0) + 1;
  }

  // 4. Filter eligible reviewers: expertise matches theme AND active < 3
  const eligible = reviewers.filter((r) =>
    r.expertise?.includes(project.theme) &&
    (activeCount[r.name] ?? 0) < 3
  );

  // 5. Fallback: any reviewer with < 3 active if not enough eligible
  const fallback = reviewers.filter(
    (r) => (activeCount[r.name] ?? 0) < 3 && !eligible.find((e) => e.email === r.email)
  );

  const pool = [...eligible, ...fallback];

  if (pool.length < numReviewers) {
    return NextResponse.json(
      { error: `Solo hay ${pool.length} revisor(es) disponible(s) con carga < 3. Se necesitan ${numReviewers}.` },
      { status: 400 }
    );
  }

  // 6. Shuffle and pick
  const shuffled = pool.sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, numReviewers);

  // 7. Update project
  const update: Record<string, string | null> = {
    reviewer:    picked[0]?.name ?? null,
    reviewer2:   numReviewers === 2 ? (picked[1]?.name ?? null) : null,
    review_mode: mode,
    status:      "reviewing",
  };

  const { error } = await supabase.from("projects").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    assigned: picked.map((r) => ({ name: r.name, email: r.email, fromExpertise: eligible.some((e) => e.email === r.email) })),
  });
}
