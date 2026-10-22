import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { sendEmail, buildAssignmentProposalsEmail } from "@/lib/email";
import { MAX_ACTIVOS } from "@/lib/assignment";
import { CLAVE_MODO, propuestasActuales, urlDelSitio } from "@/lib/assignmentServer";
import { diaSemanaChile, hoyChile } from "@/lib/deadlines";

/**
 * Propuesta diaria de asignación de revisores (Vercel Cron, ver vercel.json).
 *
 * Cada día hábil por la mañana, si la propuesta diaria está activada en el
 * panel, envía a la coordinación los proyectos que esperan revisores con la
 * propuesta para cada uno. No asigna nada: la coordinación confirma en el
 * panel. Sin proyectos pendientes, no se envía correo.
 *
 * Acceso: Vercel Cron con `Authorization: Bearer $CRON_SECRET`. Un
 * administrador con sesión puede llamarla para ver el resultado sin enviar.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const porCron = !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
  const session = porCron ? null : await getSession(req);
  if (!porCron && session?.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const dry = !porCron || req.nextUrl.searchParams.get("dry") === "1";
  const supabase = getSupabaseAdmin();

  const { data: modo } = await supabase.from("app_settings").select("value").eq("key", CLAVE_MODO).maybeSingle();
  const activa = modo?.value === "auto";
  const dia = diaSemanaChile();
  const habil = dia >= 1 && dia <= 5;

  if (!dry) {
    if (!activa) return NextResponse.json({ ok: true, skipped: "La propuesta diaria está desactivada." });
    if (!habil) return NextResponse.json({ ok: true, skipped: "Hoy no es día hábil." });
    const { data: ultima } = await supabase.from("app_settings").select("value").eq("key", "assignments_last_run").maybeSingle();
    if (ultima?.value === hoyChile()) return NextResponse.json({ ok: true, skipped: "Ya se envió hoy." });
  }

  const { propuestas } = await propuestasActuales(supabase);
  const coordinador = process.env.COORDINATOR_EMAIL;
  const resumen = propuestas.map((p) => ({
    proyecto: p.title,
    viaRapida: p.fastTrack,
    yaAsignados: p.yaAsignados,
    propuestos: p.propuestos.map((c) => `${c.name} (${c.area ? "área" : "otra área"}, ${c.activos}/${MAX_ACTIVOS})`),
    avisos: p.avisos,
  }));

  if (dry) {
    return NextResponse.json({ ok: true, dry, activa, diaHabil: habil, destinatario: coordinador ?? null, propuestas: resumen });
  }

  let enviado = false;
  if (propuestas.length > 0 && coordinador) {
    const base = urlDelSitio(req.nextUrl.origin);
    await sendEmail(
      coordinador,
      propuestas.length === 1
        ? "Propuesta de revisores · 1 proyecto esperando"
        : `Propuesta de revisores · ${propuestas.length} proyectos esperando`,
      buildAssignmentProposalsEmail({ propuestas, maxActivos: MAX_ACTIVOS, panelUrl: `${base}/revisores/dashboard` }),
    );
    enviado = true;
  }

  await supabase
    .from("app_settings")
    .upsert({ key: "assignments_last_run", value: hoyChile(), updated_at: new Date().toISOString() }, { onConflict: "key" })
    .then(() => {}, () => {});

  return NextResponse.json({ ok: true, enviado, pendientes: propuestas.length });
}
