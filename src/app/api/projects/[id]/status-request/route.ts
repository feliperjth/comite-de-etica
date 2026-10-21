import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { canAccessProject, getSession } from "@/lib/auth";
import { sendEmail, buildStatusRequestEmail } from "@/lib/email";
import { guardarMensajeYAvisar } from "@/lib/messaging";
import { revisoresPendientes, revisoresAsignados } from "@/lib/rounds";
import {
  CONSULTA_ESPERA_HORAS,
  CONSULTA_TEXTO,
  RESPUESTAS_RAPIDAS,
  ultimaConsulta,
} from "@/lib/statusRequest";
import { crearEnlaceRespuesta } from "@/lib/statusToken";

/**
 * El investigador/a consulta a sus revisores cómo va la evaluación.
 *
 * Se guarda como mensaje tipo en la conversación y se envía por correo a los
 * revisores que aún deben evaluar la ronda, con enlaces para responder sin
 * iniciar sesión. Para evitar envíos repetidos, no se puede volver a consultar
 * hasta pasadas CONSULTA_ESPERA_HORAS desde la última consulta.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession(req);
  if (!session || session.role !== "investigador") {
    return NextResponse.json({ error: "Solo el investigador/a del proyecto puede consultar el estado." }, { status: 403 });
  }

  const { origin } = await req.json().catch(() => ({ origin: "" }));
  const base = typeof origin === "string" && origin.startsWith("http") ? origin : req.nextUrl.origin;

  const supabase = getSupabaseAdmin();
  const { data: project } = await supabase
    .from("projects")
    .select("id, title, researcher_name, researcher_email, reviewer, reviewer2, current_round, status")
    .eq("id", id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  if (!canAccessProject(session, project)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!["submitted", "reviewing"].includes(project.status)) {
    return NextResponse.json(
      { error: "Tu proyecto no está en revisión en este momento, así que no hay revisión que consultar." },
      { status: 400 },
    );
  }

  const { data: mensajes } = await supabase
    .from("project_messages")
    .select("sender_type, body, created_at")
    .eq("project_id", id);

  const previa = ultimaConsulta(mensajes ?? []);
  if (previa && Date.now() - Date.parse(previa.at) < CONSULTA_ESPERA_HORAS * 3600 * 1000) {
    return NextResponse.json(
      { error: `Ya enviaste una consulta hace poco. Podrás volver a consultar ${CONSULTA_ESPERA_HORAS / 24} días después de la anterior.` },
      { status: 429 },
    );
  }

  // Destinatarios: quienes aún deben evaluar la ronda actual. Si no hay
  // revisores asignados, la consulta va a la coordinación.
  const round = project.current_round ?? 1;
  const { data: reviews } = await supabase
    .from("reviews")
    .select("reviewer_name, round, overall_decision, is_editorial")
    .eq("project_id", id);
  let nombres = revisoresPendientes(project, reviews ?? [], round);
  if (nombres.length === 0) nombres = revisoresAsignados(project);

  const { error, msg } = await guardarMensajeYAvisar(supabase, project, "investigador", CONSULTA_TEXTO);
  if (error || !msg) return NextResponse.json({ error: error ?? "No se pudo guardar la consulta." }, { status: 500 });

  let enviados = 0;
  for (const nombre of nombres) {
    const { data: rv } = await supabase
      .from("reviewers")
      .select("name, email")
      .ilike("name", nombre)
      .limit(1)
      .maybeSingle();
    if (!rv?.email) continue;

    const token = crearEnlaceRespuesta({ projectId: id, reviewer: rv.name ?? nombre, requestId: msg.id });
    const replyUrl = `${base}/revisores/estado?t=${encodeURIComponent(token)}`;
    const links = RESPUESTAS_RAPIDAS.map((r) => ({ label: r.label, url: `${replyUrl}&r=${r.key}` }));

    await sendEmail(
      rv.email,
      `Consulta de estado de revisión · ${project.title}`,
      buildStatusRequestEmail(project, rv.name ?? nombre, round, links, replyUrl, `${base}/revisores/review/${id}`),
    ).then(() => { enviados++; }).catch(() => {});
  }

  if (nombres.length === 0) {
    const coordinador = process.env.COORDINATOR_EMAIL;
    if (coordinador) {
      await sendEmail(
        coordinador,
        `Consulta de estado (sin revisores asignados) · ${project.title}`,
        buildStatusRequestEmail(project, "Coordinación", round, [], `${base}/revisores/dashboard`, `${base}/revisores/dashboard`),
      ).then(() => { enviados++; }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, sentAt: msg.created_at, recipients: enviados });
}
