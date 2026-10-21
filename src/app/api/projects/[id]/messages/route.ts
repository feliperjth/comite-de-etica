import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { guardarMensajeYAvisar, senderTypeDeRevisor, type SenderType } from "@/lib/messaging";
import { canAccessProject, getSession } from "@/lib/auth";
import { iniciosDeRonda, mismoNombre, rondaDeFecha } from "@/lib/rounds";
import { CONSULTA_ESPERA_HORAS, ultimaConsulta } from "@/lib/statusRequest";

/** Hito de la conversación que no es un mensaje: envíos y evaluaciones. */
type Evento =
  | { kind: "submitted"; round: number; at: string }
  | { kind: "resubmitted"; round: number; at: string }
  | {
      kind: "review";
      round: number;
      at: string;
      who: "revisor1" | "revisor2" | "coordinacion";
      decision: "accepted" | "corrections";
    };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const supabase = getSupabaseAdmin();

  // Un investigador solo puede leer la conversación de sus propios proyectos.
  const { data: project } = await supabase
    .from("projects")
    .select("researcher_email, created_at, current_round, status, reviewer, reviewer2")
    .eq("id", id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  if (!canAccessProject(session, project)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [{ data: mensajes }, { data: docs }, { data: reviews }] = await Promise.all([
    supabase
      .from("project_messages")
      .select("id, sender_type, body, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("documents")
      .select("file_path, created_at")
      .eq("project_id", id)
      .like("file_path", "%/revision-%"),
    supabase
      .from("reviews")
      .select("reviewer_name, round, overall_decision, is_editorial, submitted_at")
      .eq("project_id", id),
  ]);

  // Los mensajes no guardan su ronda: se deduce por la fecha (ver rounds.ts).
  const currentRound = project.current_round ?? 1;
  const inicios = iniciosDeRonda({
    createdAt: project.created_at,
    currentRound,
    docs: docs ?? [],
    reviews: reviews ?? [],
  });

  const messages = (mensajes ?? []).map((m) => ({
    ...m,
    round: rondaDeFecha(inicios, m.created_at),
  }));

  const eventos: Evento[] = [];
  if (project.created_at) eventos.push({ kind: "submitted", round: 1, at: project.created_at });
  for (let n = 2; n <= currentRound; n++) {
    eventos.push({ kind: "resubmitted", round: n, at: new Date(inicios[n - 1]).toISOString() });
  }

  // El investigador recibe el resultado cuando la ronda se cierra: antes de
  // eso no se le muestra qué decidió cada revisor.
  const cerrado = ["corrections", "approved", "rejected", "certified"].includes(project.status ?? "");
  const esInvestigador = session.role === "investigador";

  for (const r of reviews ?? []) {
    if (!r.submitted_at) continue;
    if (esInvestigador && r.round >= currentRound && !cerrado) continue;
    const who: "revisor1" | "revisor2" | "coordinacion" = r.is_editorial
      ? "coordinacion"
      : mismoNombre(r.reviewer_name, project.reviewer2) && !mismoNombre(r.reviewer_name, project.reviewer)
      ? "revisor2"
      : "revisor1";
    eventos.push({
      kind: "review",
      round: r.round,
      at: r.submitted_at,
      who,
      decision: r.overall_decision === "accepted" ? "accepted" : "corrections",
    });
  }

  // Consulta de estado: la última y si ya se puede volver a consultar.
  const consulta = ultimaConsulta(mensajes ?? []);
  const enRevision = ["submitted", "reviewing"].includes(project.status ?? "");
  const proximaConsulta = consulta
    ? Date.parse(consulta.at) + CONSULTA_ESPERA_HORAS * 3600 * 1000
    : 0;

  return NextResponse.json({
    messages,
    events: eventos,
    currentRound,
    statusRequest: {
      last: consulta,
      canRequest: enRevision && !!(project.reviewer || project.reviewer2) && Date.now() >= proximaConsulta,
      inReview: enRevision,
      nextAllowedAt: consulta ? new Date(proximaConsulta).toISOString() : null,
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });

  const supabase = getSupabaseAdmin();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, researcher_email, reviewer, reviewer2")
    .eq("id", id)
    .single();
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let senderType: string;

  if (session.role === "investigador") {
    if (!canAccessProject(session, project)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    senderType = "investigador";
  } else {
    const { data: reviewer } = await supabase
      .from("reviewers")
      .select("name")
      .eq("email", session.email)
      .maybeSingle();

    senderType = senderTypeDeRevisor(project, reviewer?.name);
  }

  const { error, msg } = await guardarMensajeYAvisar(supabase, project, senderType as SenderType, body.trim());
  if (error) return NextResponse.json({ error }, { status: 500 });

  return NextResponse.json({ message: msg });
}

