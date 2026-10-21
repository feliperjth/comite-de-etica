import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { sendEmail, buildReviewReminderEmail } from "@/lib/email";
import { revisoresPendientes } from "@/lib/rounds";
import { senderTypeDeRevisor } from "@/lib/messaging";
import { plazosDeProyectos } from "@/lib/deadlinesServer";
import {
  diaSemanaChile,
  diasMinimosParaAviso,
  diasSinActividadParaAviso,
  enPlazoDeRevision,
  fechaLarga,
  hoyChile,
  tocaHoy,
} from "@/lib/deadlines";

/**
 * Recordatorios automáticos de revisión (Vercel Cron, ver vercel.json).
 *
 * Se ejecuta lunes, jueves y viernes por la mañana. Los viernes avisa en los
 * proyectos normales; lunes y jueves, en los de vía rápida. Por cada proyecto
 * en revisión, a cada revisor que aún debe evaluar la ronda, salvo que:
 *  - la ronda haya empezado hace muy poco (4 días; 1 en vía rápida), o
 *  - el revisor haya tenido actividad reciente en el proyecto (un mensaje o
 *    un documento subido en los últimos 7 días; 3 en vía rápida).
 * Con el plazo vencido, el aviso va con copia a la coordinación.
 *
 * Acceso: Vercel Cron envía `Authorization: Bearer $CRON_SECRET`. Una sesión
 * de administrador puede llamarla con `?dry=1` para ver a quién se enviaría
 * sin enviar nada (y con `?dia=5` simular un viernes).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const porCron = !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
  const session = porCron ? null : await getSession(req);
  const esAdmin = session?.role === "admin";
  if (!porCron && !esAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Un administrador solo puede simular: nunca dispara correos a mano.
  const dry = !porCron || req.nextUrl.searchParams.get("dry") === "1";
  const diaParam = Number(req.nextUrl.searchParams.get("dia"));
  const diaSemana = esAdmin && Number.isInteger(diaParam) && diaParam >= 0 && diaParam <= 6
    ? diaParam
    : diaSemanaChile();

  const supabase = getSupabaseAdmin();

  // Evita un segundo envío el mismo día si Vercel reintenta la ejecución.
  const hoy = hoyChile();
  if (!dry) {
    const { data: ultima } = await supabase
      .from("app_settings").select("value").eq("key", "reminders_last_run").maybeSingle();
    if (ultima?.value === hoy) {
      return NextResponse.json({ ok: true, skipped: "Ya se enviaron los recordatorios hoy." });
    }
  }

  const { data: proyectos, error } = await supabase
    .from("projects")
    .select("*")
    .in("status", ["submitted", "reviewing"]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const activos = (proyectos ?? []).filter((p) => enPlazoDeRevision(p.status) && (p.reviewer || p.reviewer2));
  if (activos.length === 0) {
    return NextResponse.json({ ok: true, dry, diaSemana, enviados: [], omitidos: [] });
  }
  const plazos = await plazosDeProyectos(supabase, activos);
  const ids = activos.map((p) => p.id);

  const desde = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [{ data: reviews }, { data: mensajes }, { data: docs }, { data: revisores }] = await Promise.all([
    supabase.from("reviews").select("project_id, reviewer_name, round, overall_decision, is_editorial").in("project_id", ids),
    supabase.from("project_messages").select("project_id, sender_type, created_at").in("project_id", ids).gte("created_at", desde),
    supabase.from("documents").select("project_id, uploaded_by, created_at").in("project_id", ids).gte("created_at", desde),
    supabase.from("reviewers").select("name, email"),
  ]);

  const emailDe = (nombre: string) =>
    (revisores ?? []).find((r) => (r.name ?? "").trim().toLowerCase() === nombre.trim().toLowerCase())?.email ?? null;

  // Los enlaces del correo apuntan al dominio oficial del portal.
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : req.nextUrl.origin);
  const coordinador = process.env.COORDINATOR_EMAIL;
  const enviados: { proyecto: string; revisor: string; vencido: boolean; viaRapida: boolean }[] = [];
  const omitidos: { proyecto: string; revisor?: string; motivo: string }[] = [];

  for (const p of activos) {
    const plazo = plazos[p.id];
    if (!plazo) continue;
    if (!tocaHoy(plazo.viaRapida, diaSemana)) continue;

    if (plazo.diasTranscurridos < diasMinimosParaAviso(plazo.viaRapida)) {
      omitidos.push({ proyecto: p.title, motivo: `la ronda empezó hace ${plazo.diasTranscurridos} día(s)` });
      continue;
    }

    const round = p.current_round ?? 1;
    const pendientes = revisoresPendientes(p, (reviews ?? []).filter((r) => r.project_id === p.id), round);
    const ventana = Date.now() - diasSinActividadParaAviso(plazo.viaRapida) * 86_400_000;

    for (const nombre of pendientes) {
      const email = emailDe(nombre);
      if (!email) {
        omitidos.push({ proyecto: p.title, revisor: nombre, motivo: "sin correo registrado" });
        continue;
      }

      const tipo = senderTypeDeRevisor(p, nombre);
      const activo =
        (mensajes ?? []).some((m) => m.project_id === p.id && m.sender_type === tipo && Date.parse(m.created_at) >= ventana) ||
        (docs ?? []).some((d) => d.project_id === p.id && (d.uploaded_by ?? "").toLowerCase() === email.toLowerCase() && Date.parse(d.created_at) >= ventana);
      if (activo) {
        omitidos.push({ proyecto: p.title, revisor: nombre, motivo: "tuvo actividad reciente" });
        continue;
      }

      const registro = { proyecto: p.title, revisor: nombre, vencido: plazo.vencido, viaRapida: plazo.viaRapida };
      if (dry) { enviados.push(registro); continue; }

      await sendEmail(
        email,
        plazo.vencido
          ? `Plazo de revisión vencido · ${p.title}`
          : `Recordatorio de revisión · ${p.title}`,
        buildReviewReminderEmail({
          reviewerName: nombre,
          title: p.title,
          researcherName: p.researcher_name,
          round,
          limite: fechaLarga(plazo.limite),
          diasTranscurridos: plazo.diasTranscurridos,
          diasRestantes: plazo.diasRestantes,
          viaRapida: plazo.viaRapida,
          reviewUrl: `${base}/revisores/review/${p.id}`,
        }),
        plazo.vencido && coordinador ? coordinador : undefined,
      ).then(() => { enviados.push(registro); }, (e) => {
        omitidos.push({ proyecto: p.title, revisor: nombre, motivo: `error al enviar: ${e instanceof Error ? e.message : String(e)}` });
      });
    }
  }

  if (!dry) {
    await supabase
      .from("app_settings")
      .upsert({ key: "reminders_last_run", value: hoy, updated_at: new Date().toISOString() })
      .then(() => {}, () => {});
  }

  return NextResponse.json({ ok: true, dry, diaSemana, enviados, omitidos });
}
