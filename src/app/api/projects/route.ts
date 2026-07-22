import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";

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

const TIPOS   = ["pregrado", "magister", "doctorado", "fondecyt", "academico", "otro"];
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
  if (!TIPOS.includes(project_type)) {
    return NextResponse.json({ error: "Tipo de proyecto no reconocido." }, { status: 400 });
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

  const { data, error } = await supabase
    .from("projects")
    .insert({
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
    })
    .select("id, tracking_code")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id, tracking_code: data.tracking_code });
}
