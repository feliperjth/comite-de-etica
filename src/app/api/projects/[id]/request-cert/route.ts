import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import {
  sendEmail,
  buildCertRequestEmail,
  ETHICS_COMMITTEE_EMAIL,
} from "@/lib/email";
import { generateCertToken } from "@/app/api/certify/route";
import { requireStaff } from "@/lib/auth";

// POST: (re)envía a Macarena el correo de solicitud de certificado de ética.
// Mismo correo que se manda automáticamente al aprobarse el proyecto, pero
// disparado a mano por el coordinador desde el panel. Útil cuando el envío
// automático falló, se perdió, o se necesita reenviar el certificado.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Envía correo a Macarena con documentos adjuntos: solo personal del comité.
  const { response } = await requireStaff(request);
  if (response) return response;

  const { id } = await params;
  const supabase = getSupabaseServer();

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
  }

  // El certificado solo se solicita tras la aprobación del comité; permitimos
  // 'approved' y 'certified' (reenvío de uno ya tramitado).
  if (!["approved", "certified"].includes(project.status)) {
    return NextResponse.json(
      { error: "El proyecto debe estar aprobado para solicitar el certificado." },
      { status: 400 },
    );
  }

  const macarenaEmail = process.env.MACARENA_EMAIL;
  if (!macarenaEmail) {
    return NextResponse.json(
      { error: "Falta configurar MACARENA_EMAIL en el servidor." },
      { status: 500 },
    );
  }

  // Origen para los enlaces del correo (botón de subir certificado, etc.).
  const origin =
    request.headers.get("origin") ??
    (() => {
      const ref = request.headers.get("referer") ?? "";
      const m = ref.match(/^(https?:\/\/[^/]+)/);
      return m ? m[1] : "";
    })();

  try {
    const certToken = generateCertToken(project.id);
    const { html, attachments } = await buildCertRequestEmail(
      supabase,
      project,
      origin,
      certToken,
    );
    await sendEmail(
      macarenaEmail,
      `Solicitud certificado de ética · ${project.title}`,
      html,
      [project.researcher_email, ETHICS_COMMITTEE_EMAIL],
      attachments,
    );
    return NextResponse.json({ ok: true, to: macarenaEmail });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al enviar el correo.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
