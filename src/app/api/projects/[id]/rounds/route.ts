import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { requireStaff } from "@/lib/auth";
import { resumenRondas, revisoresPendientes, revisoresRequeridos } from "@/lib/rounds";

/**
 * Historial de rondas de un proyecto para la pantalla de revisión: qué hizo
 * cada revisor asignado en cada ronda y a quién le toca en la actual.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, response } = await requireStaff(req);
  if (response) return response;

  const { id } = await params;
  const supabase = getSupabaseServer();

  const { data: project } = await supabase
    .from("projects")
    .select("id, reviewer, reviewer2, current_round, status")
    .eq("id", id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("reviewer_name, round, overall_decision, is_editorial, submitted_at")
    .eq("project_id", id)
    .order("round", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mismo criterio de nombre que /api/reviews: la ficha de revisor manda.
  const { data: reviewerRow } = await supabase
    .from("reviewers")
    .select("name")
    .eq("email", session.email)
    .maybeSingle();
  const me = reviewerRow?.name ?? session.name ?? session.email;

  const round = project.current_round ?? 1;
  const all = reviews ?? [];

  return NextResponse.json({
    me,
    currentRound: round,
    status: project.status,
    reviewers: resumenRondas(project, all),
    required: revisoresRequeridos(project, all, round),
    pending: revisoresPendientes(project, all, round),
    // Rondas que cerró la coordinación en nombre de los revisores.
    editorialRounds: [...new Set(all.filter((r) => r.is_editorial).map((r) => r.round))],
  });
}
