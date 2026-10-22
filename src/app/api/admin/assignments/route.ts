import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";
import { sendEmail, buildReviewerAssignedEmail } from "@/lib/email";
import { asignadosDe, mismaPersona, validarAsignacion, MAX_ACTIVOS, REVISORES_POR_PROYECTO } from "@/lib/assignment";
import { propuestasActuales, urlDelSitio } from "@/lib/assignmentServer";

/**
 * Asignación de revisores (coordinación).
 *
 * GET  → propuestas para los proyectos que esperan revisores, calculadas en
 *        el momento (ver src/lib/assignment.ts).
 * POST → confirma una o varias asignaciones: { items: [{ projectId, reviewers }] }.
 *        Se valida de nuevo cada una, se guarda, el proyecto pasa a "En
 *        revisión" y se avisa por correo a los revisores nuevos.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { response } = await requireAdmin(req);
  if (response) return response;
  try {
    const { propuestas, noDisponibles } = await propuestasActuales(getSupabaseAdmin());
    return NextResponse.json({ propuestas, noDisponibles, maxActivos: MAX_ACTIVOS });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

type Item = { projectId: string; reviewers: string[] };

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const items: Item[] = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) return NextResponse.json({ error: "No hay asignaciones para confirmar." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: revisores } = await supabase.from("reviewers").select("name, email, expertise");
  const base = urlDelSitio(req.nextUrl.origin);

  const resultados: { projectId: string; ok: boolean; asignados?: string[]; avisados?: string[]; error?: string }[] = [];

  for (const it of items) {
    const { data: p } = await supabase.from("projects").select("*").eq("id", it.projectId).maybeSingle();
    if (!p) { resultados.push({ projectId: it.projectId, ok: false, error: "Proyecto no encontrado." }); continue; }

    // Se respetan los revisores que el proyecto ya tenga; los elegidos completan cupos.
    const ya = asignadosDe(p);
    const nuevos = (it.reviewers ?? [])
      .filter((n) => n && n.trim())
      .filter((n) => !ya.some((y) => mismaPersona(y, n)))
      .slice(0, Math.max(0, REVISORES_POR_PROYECTO - ya.length));
    const finales = [...ya, ...nuevos];

    const errores = validarAsignacion(p, nuevos.length ? finales : [], revisores ?? []);
    if (nuevos.length === 0) errores.unshift(ya.length >= REVISORES_POR_PROYECTO ? "El proyecto ya tiene sus revisores." : "Elige al menos un revisor/a.");
    if (errores.length) { resultados.push({ projectId: p.id, ok: false, error: errores[0] }); continue; }

    // Nombres tal como están registrados.
    const oficial = (n: string) => (revisores ?? []).find((r) => mismaPersona(r.name, n))?.name ?? n;
    const update = {
      reviewer:    oficial(finales[0]),
      reviewer2:   finales[1] ? oficial(finales[1]) : null,
      review_mode: "individual",
      status:      p.status === "submitted" ? "reviewing" : p.status,
    };
    const { data: guardado, error } = await supabase.from("projects").update(update).eq("id", p.id).select().single();
    if (error || !guardado) { resultados.push({ projectId: p.id, ok: false, error: error?.message ?? "No se pudo guardar." }); continue; }

    const avisados: string[] = [];
    for (const n of nuevos) {
      const r = (revisores ?? []).find((x) => mismaPersona(x.name, n));
      if (!r?.email) continue;
      try {
        await sendEmail(
          r.email,
          `Proyecto asignado para revisión · ${guardado.title}`,
          buildReviewerAssignedEmail(guardado, r.name, base),
        );
        avisados.push(r.name);
      } catch { /* el resultado indica a quién no se avisó */ }
    }
    resultados.push({ projectId: p.id, ok: true, asignados: [update.reviewer, update.reviewer2].filter(Boolean) as string[], avisados });
  }

  return NextResponse.json({ resultados });
}
