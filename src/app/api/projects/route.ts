import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { isProjectType, projectTypeLabel } from "@/lib/projectTypes";
import { sendEmail, buildFastTrackRequestEmail } from "@/lib/email";
import { diasHastaLimite } from "@/lib/fastTrack";

/**
 * Alta de un proyecto desde el formulario público de /submit.
 *
 * Es público a propósito: quien envía todavía no tiene sesión. Antes esta
 * inserción la hacía el navegador con la clave anónima, lo que obligaba a
 * dejar la tabla `projects` escribible por cualquiera.
 *
 * Solo se aceptan los campos del formulario: nada de `status`, `progress`,
 * `reviewer` ni `tracking_code` desde el cliente. Si se aceptaran, cualquiera
 * podría darse por aprobado.
 */

const CHARS   = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const MAX_LEN = 300;

function generarCodigo(): string {
  let code = "CE-";
  for (let i = 0; i < 6; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

/** Texto obligatorio, recortado y acotado. */
function texto(v: unknown, max = MAX_LEN): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const title           = texto(body.title);
  const researcher_name = texto(body.researcher_name, 200);
  const email           = texto(body.researcher_email, 200);
  const project_type    = texto(body.project_type, 40);
  const theme           = texto(body.theme, 60);

  if (!title || !researcher_name || !email || !project_type || !theme) {
    return NextResponse.json(
      { error: "Faltan campos obligatorios (título, nombre, correo, tipo y área)." },
      { status: 400 },
    );
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "El correo no es válido." }, { status: 400 });
  }
  if (!isProjectType(project_type)) {
    return NextResponse.json({ error: "Tipo de proyecto no reconocido." }, { status: 400 });
  }

  // Vía rápida: requiere una fecha límite válida y que no haya pasado.
  const fast_track = body.fast_track === true;
  let fast_track_deadline: string | null = null;
  if (fast_track) {
    const f = texto(body.fast_track_deadline, 10);
    const dias = diasHastaLimite(f);
    if (!f || !/^\d{4}-\d{2}-\d{2}$/.test(f) || dias === null) {
      return NextResponse.json({ error: "Indica la fecha límite del concurso para la vía rápida." }, { status: 400 });
    }
    if (dias < 0) {
      return NextResponse.json({ error: "La fecha límite del concurso ya pasó." }, { status: 400 });
    }
    fast_track_deadline = f;
  }

  const supabase = getSupabaseServer();

  // El código lo genera el servidor y se comprueba que esté libre: si lo
  // eligiera el cliente podría reutilizar el de otro y ver su expediente,
  // porque /track/CE-XXXXXX autoriza justamente por ese código.
  let tracking_code = "";
  for (let intento = 0; intento < 8 && !tracking_code; intento++) {
    const candidato = generarCodigo();
    const { data: chocan } = await supabase
      .from("projects").select("id").eq("tracking_code", candidato).maybeSingle();
    if (!chocan) tracking_code = candidato;
  }
  if (!tracking_code) {
    return NextResponse.json({ error: "No se pudo generar un código único." }, { status: 500 });
  }

  const fila: Record<string, unknown> = {
      title,
      researcher_name,
      researcher_email: email.toLowerCase(),
      researcher_rut:   texto(body.researcher_rut, 20),
      researcher_role:  texto(body.researcher_role, 60),
      project_type,
      theme,
      abstract:       texto(body.abstract, 5000),
      advisor_name:   texto(body.advisor_name, 200),
      funding_type:   texto(body.funding_type, 40),
      funding_folio:  texto(body.funding_folio, 60),
      funding_detail: texto(body.funding_detail, 500),
      // Estado inicial: lo fija el servidor, nunca el formulario.
      status:   "submitted",
      progress: 10,
      tracking_code,
  };
  if (fast_track) {
    fila.fast_track = true;
    fila.fast_track_deadline = fast_track_deadline;
  }

  let { data, error } = await supabase
    .from("projects")
    .insert(fila)
    .select("id, tracking_code")
    .single();

  // Si la migración projects_fast_track aún no se aplicó, las columnas no
  // existen: se guarda igual y la solicitud queda anotada en funding_detail
  // para no perderla.
  if (error && fast_track && /fast_track/.test(error.message)) {
    delete fila.fast_track;
    delete fila.fast_track_deadline;
    const nota = `[Vía rápida solicitada · fecha límite ${fast_track_deadline}]`;
    fila.funding_detail = [nota, fila.funding_detail].filter(Boolean).join(" ").slice(0, 500);
    ({ data, error } = await supabase
      .from("projects")
      .insert(fila)
      .select("id, tracking_code")
      .single());
  }

  if (error || !data) return NextResponse.json({ error: error?.message ?? "No se pudo registrar el proyecto." }, { status: 500 });

  // La vía rápida necesita el acuerdo de la coordinación: se le avisa en el acto.
  const coordinador = process.env.COORDINATOR_EMAIL;
  if (fast_track && coordinador) {
    const origin = req.nextUrl.origin;
    await sendEmail(
      coordinador,
      `Solicitud de vía rápida · ${title}`,
      buildFastTrackRequestEmail(
        { title, researcher_name, researcher_email: email, project_type: projectTypeLabel(project_type), tracking_code: data.tracking_code },
        fast_track_deadline!,
        `${origin}/revisores/dashboard`,
      ),
    ).catch(() => {});
  }

  return NextResponse.json({ id: data.id, tracking_code: data.tracking_code });
}
