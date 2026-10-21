import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { esConsultaEstado, esRespuestaEstado } from "@/lib/statusRequest";

/**
 * Mensajes entre investigador/a y revisores: guardar uno y avisar por correo
 * a la otra parte. Lo usan el chat del portal y la respuesta a una consulta de
 * estado que el revisor envía desde el enlace del correo.
 */

export type SenderType = "investigador" | "revisor1" | "revisor2";

type ProyectoMensajes = {
  id: string;
  title: string;
  researcher_email: string | null;
  reviewer: string | null;
  reviewer2: string | null;
};

/** El texto llega del usuario: se escapa antes de meterlo en el HTML del correo. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}

/** Revisor 1 o 2 según el nombre asignado; por defecto, 1. */
export function senderTypeDeRevisor(project: ProyectoMensajes, name: string | null | undefined): SenderType {
  const n = (name ?? "").trim().toLowerCase();
  if (n && (project.reviewer2 ?? "").trim().toLowerCase() === n &&
      (project.reviewer ?? "").trim().toLowerCase() !== n) {
    return "revisor2";
  }
  return "revisor1";
}

export async function guardarMensajeYAvisar(
  supabase: SupabaseClient,
  project: ProyectoMensajes,
  senderType: SenderType,
  body: string,
  opts: { origin?: string; avisarRevisores?: boolean } = {},
) {
  const { data: msg, error } = await supabase
    .from("project_messages")
    .insert({ project_id: project.id, sender_type: senderType, body })
    .select()
    .single();
  if (error) return { error: error.message, msg: null };

  if (senderType === "investigador") {
    // La consulta de estado tiene su propio correo (ver status-request).
    if (opts.avisarRevisores !== false && !esConsultaEstado(body)) {
      for (const name of [project.reviewer, project.reviewer2].filter(Boolean) as string[]) {
        const { data: rv } = await supabase
          .from("reviewers").select("email").ilike("name", name).limit(1).maybeSingle();
        if (rv?.email) {
          sendEmail(
            rv.email,
            `Nuevo mensaje sobre proyecto · ${project.title}`,
            buildReviewerMsgEmail(project.title, body),
          ).catch(() => {});
        }
      }
    }
  } else if (project.researcher_email) {
    const label = senderType === "revisor1" ? "Revisor 1" : "Revisor 2";
    const esEstado = esRespuestaEstado(body);
    sendEmail(
      project.researcher_email,
      esEstado
        ? `${label} respondió tu consulta de estado · ${project.title}`
        : `${label} ha respondido · ${project.title}`,
      buildInvestigadorReplyEmail(project.title, body, label, esEstado),
    ).catch(() => {});
  }

  return { error: null, msg };
}

function buildReviewerMsgEmail(title: string, rawBody: string) {
  const body = escapeHtml(rawBody);
  title = escapeHtml(title);
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
<tr><td style="background:#1A1A1A;padding:28px 40px;text-align:center;">
  <p style="margin:0 0 4px;color:#CC5200;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Escuela de Psicología · UAI</p>
  <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Comité de Ética</h1>
</td></tr>
<tr><td style="padding:36px 40px;">
  <p style="font-size:14px;color:#555;">Tienes un <strong>nuevo mensaje del investigador/a</strong> sobre el proyecto:</p>
  <div style="background:#f0f9ff;border-left:4px solid #3b82f6;border-radius:8px;padding:14px 18px;margin:16px 0;">
    <p style="margin:0;font-size:14px;font-weight:700;color:#1a1a1a;">${title}</p>
  </div>
  <div style="background:#f9f9f9;border-radius:8px;padding:16px 20px;border:1px solid #e5e7eb;">
    <p style="margin:0 0 6px;font-size:11px;color:#999;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Mensaje</p>
    <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">${body}</p>
  </div>
  <p style="font-size:13px;color:#555;margin-top:20px;">Ingresa al <strong>Panel de Revisores</strong> para responder.</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

function buildInvestigadorReplyEmail(title: string, rawBody: string, label: string, esEstado = false) {
  const body = escapeHtml(rawBody);
  title = escapeHtml(title);
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
<tr><td style="background:#1A1A1A;padding:28px 40px;text-align:center;">
  <p style="margin:0 0 4px;color:#CC5200;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Escuela de Psicología · UAI</p>
  <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Comité de Ética</h1>
</td></tr>
<tr><td style="padding:36px 40px;">
  <p style="font-size:14px;color:#555;"><strong>${label}</strong> ${esEstado ? "respondió tu consulta de estado de revisión" : "ha respondido tu mensaje"} sobre:</p>
  <div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:8px;padding:14px 18px;margin:16px 0;">
    <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#1a1a1a;">${title}</p>
    <p style="margin:0;font-size:12px;color:#6b7280;">${label}</p>
  </div>
  <div style="background:#f9f9f9;border-radius:8px;padding:16px 20px;border:1px solid #e5e7eb;">
    <p style="margin:0 0 6px;font-size:11px;color:#999;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Respuesta</p>
    <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">${body}</p>
  </div>
  <p style="font-size:13px;color:#555;margin-top:20px;">Ingresa al portal de seguimiento para ver el hilo completo.</p>
</td></tr>
</table></td></tr></table></body></html>`;
}
