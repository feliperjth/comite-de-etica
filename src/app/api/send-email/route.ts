import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { sendEmail, buildSubmittedEmail } from "@/lib/email";

/**
 * Correo de confirmación de envío, disparado por /submit al crear el proyecto.
 *
 * No lleva sesión a propósito: lo llama un investigador anónimo. Por eso NADA
 * del contenido del correo viene de la petición — solo el id del proyecto, y
 * el resto se lee de la base.
 *
 * Antes se recibían `to`, `projectTitle`, `researcherName` y `origin` del
 * cuerpo. Como `origin` arma el enlace del botón, cualquiera podía hacer que
 * la cuenta del comité enviara un correo con su diseño real, a quien quisiera,
 * apuntando a un dominio arbitrario.
 */

/** Margen tras la creación durante el que tiene sentido confirmar el envío. */
const MAX_AGE_MS = 10 * 60 * 1000;

function resolveOrigin(req: NextRequest): string {
  const header = req.headers.get("origin");
  if (header) return header;
  const referer = req.headers.get("referer") ?? "";
  return referer.match(/^(https?:\/\/[^/]+)/)?.[1] ?? "";
}

export async function POST(req: NextRequest) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return NextResponse.json({ ok: false, error: "Email no configurado" });
  }

  const { projectId } = await req.json().catch(() => ({ projectId: null }));
  if (!projectId) {
    return NextResponse.json({ ok: false, error: "Falta projectId" }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const { data: project } = await supabase
    .from("projects")
    .select("title, researcher_name, researcher_email, tracking_code, created_at")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ ok: false, error: "Proyecto no encontrado" }, { status: 404 });
  }

  // Evita que se pueda reenviar el correo de cualquier proyecto a voluntad.
  const age = Date.now() - new Date(project.created_at).getTime();
  if (age > MAX_AGE_MS) {
    return NextResponse.json({ ok: false, error: "El proyecto no es reciente." }, { status: 403 });
  }

  try {
    await sendEmail(
      project.researcher_email,
      `Proyecto recibido · ${project.tracking_code} · Comité de Ética UAI`,
      buildSubmittedEmail(
        {
          title: project.title,
          researcher_name: project.researcher_name ?? project.researcher_email,
          tracking_code: project.tracking_code,
        },
        resolveOrigin(req),
      ),
    );
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("Email error:", e);
    return NextResponse.json({ ok: false, error: String(e) });
  }
}
