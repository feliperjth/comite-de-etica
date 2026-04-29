import nodemailer from "nodemailer";

export function getTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

export async function sendEmail(to: string, subject: string, html: string, cc?: string) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  const t = getTransporter();
  await t.sendMail({
    from: `"Comité de Ética UAI" <${process.env.EMAIL_USER}>`,
    to,
    cc,
    subject,
    html,
  });
}

const HEADER = `
  <div style="background:#1A1A1A;padding:28px 40px;text-align:center;">
    <p style="margin:0 0 4px;color:#CC5200;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Escuela de Psicología · UAI</p>
    <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Comité de Ética</h1>
  </div>`;

const FOOTER = `
  <div style="background:#f9f9f9;padding:18px 40px;text-align:center;border-top:1px solid #eee;">
    <p style="margin:0;font-size:11px;color:#aaa;">© 2025 Comité de Ética · Escuela de Psicología · Universidad Adolfo Ibáñez</p>
  </div>`;

function wrap(body: string) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <tr><td>${HEADER}</td></tr>
      <tr><td style="padding:36px 40px;">${body}</td></tr>
      <tr><td>${FOOTER}</td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

/* ── Email: proyecto recibido (investigador) ──────────────────── */
export function buildSubmittedEmail(project: {
  title: string;
  researcher_name: string;
  tracking_code: string;
}, origin: string) {
  const trackUrl = `${origin}/track/${project.tracking_code}`;
  const body = `
    <p style="font-size:16px;font-weight:700;color:#1A1A1A;margin:0 0 8px;">Tu proyecto fue recibido exitosamente</p>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Estimada/o <strong>${project.researcher_name}</strong>, hemos recibido tu proyecto de investigación. Puedes revisar el estado de la evaluación en cualquier momento con tu código de seguimiento.
    </p>
    <div style="background:#f9f9f9;border-radius:8px;padding:20px;border-left:4px solid #CC5200;margin-bottom:20px;">
      <p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;font-weight:700;">Proyecto recibido</p>
      <p style="margin:0;font-size:15px;color:#1A1A1A;font-weight:600;line-height:1.4;">${project.title}</p>
    </div>
    <div style="background:#1A1A1A;border-radius:8px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0 0 8px;font-size:11px;color:#CC5200;text-transform:uppercase;letter-spacing:2px;font-weight:700;">Código de seguimiento</p>
      <p style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:4px;">${project.tracking_code}</p>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${trackUrl}" style="display:inline-block;background:#CC5200;color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 32px;border-radius:8px;">Ver estado de mi proyecto</a>
    </div>
    <p style="font-size:12px;color:#999;margin:0;">Si no enviaste este proyecto, por favor ignora este correo. Para consultas contacta al Comité de Ética de la Escuela de Psicología UAI.</p>`;
  return wrap(body);
}

/* ── Email: proyecto rechazado ─────────────────────────────────── */
export function buildRejectedEmail(project: {
  title: string;
  researcher_name: string;
  tracking_code: string | null;
}, origin: string) {
  const trackUrl = `${origin}/track/${project.tracking_code}`;
  const body = `
    <p style="font-size:16px;font-weight:700;color:#1A1A1A;margin:0 0 8px;">Resultado de la evaluación ética</p>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Estimada/o <strong>${project.researcher_name}</strong>, el Comité de Ética de la Escuela de Psicología UAI ha concluido la evaluación de tu proyecto y, en esta instancia, <strong style="color:#dc2626;">no ha podido ser aprobado</strong>.
    </p>
    <div style="background:#fef2f2;border-radius:8px;padding:20px;border-left:4px solid #dc2626;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;font-weight:700;">Proyecto evaluado</p>
      <p style="margin:0;font-size:15px;color:#1A1A1A;font-weight:600;">${project.title}</p>
    </div>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Si deseas conocer los detalles de la evaluación o tienes consultas sobre los fundamentos de esta decisión, puedes revisar el historial de tu proyecto o comunicarte directamente con el Comité.
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${trackUrl}" style="display:inline-block;background:#1A1A1A;color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 32px;border-radius:8px;">Ver historial del proyecto</a>
    </div>
    <p style="font-size:12px;color:#999;margin:0;">Código de seguimiento: <strong>${project.tracking_code}</strong></p>`;
  return wrap(body);
}

/* ── Email: revisor asignado ───────────────────────────────────── */
export function buildReviewerAssignedEmail(project: {
  title: string;
  researcher_name: string;
  id: string;
  current_round: number | null;
}, reviewerName: string, origin: string) {
  const round  = project.current_round ?? 1;
  const reviewUrl = `${origin}/revisores/review/${project.id}`;
  const body = `
    <p style="font-size:16px;font-weight:700;color:#1A1A1A;margin:0 0 8px;">Tienes un proyecto asignado para revisión</p>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Estimada/o <strong>${reviewerName}</strong>, se te ha asignado la revisión del siguiente proyecto en el Comité de Ética de la Escuela de Psicología UAI.
    </p>
    <div style="background:#f9f9f9;border-radius:8px;padding:20px;border-left:4px solid #CC5200;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;font-weight:700;">Proyecto · Ronda ${round}</p>
      <p style="margin:0 0 6px;font-size:15px;color:#1A1A1A;font-weight:600;">${project.title}</p>
      <p style="margin:0;font-size:13px;color:#888;">Investigador/a: ${project.researcher_name}</p>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${reviewUrl}" style="display:inline-block;background:#CC5200;color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 32px;border-radius:8px;">Revisar proyecto</a>
    </div>
    <p style="font-size:13px;color:#555;margin:0;">Ingresa con tu correo institucional UAI en <a href="${origin}/revisores" style="color:#CC5200;">${origin}/revisores</a> si aún no tienes sesión activa.</p>`;
  return wrap(body);
}

/* ── Email: aprobación ─────────────────────────────────────────── */
export function buildApprovalEmail(project: {
  title: string;
  researcher_name: string;
  tracking_code: string | null;
  researcher_email: string;
}, origin: string) {
  const trackUrl = `${origin}/track/${project.tracking_code}`;
  const body = `
    <p style="font-size:16px;font-weight:700;color:#1A1A1A;margin:0 0 8px;">¡Tu proyecto fue aprobado!</p>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Estimada/o <strong>${project.researcher_name}</strong>, el Comité de Ética de la Escuela de Psicología UAI ha revisado tu proyecto y <strong style="color:#16a34a;">ha sido aprobado por ambos revisores</strong>.
    </p>
    <div style="background:#f0fdf4;border-radius:8px;padding:20px;border-left:4px solid #22c55e;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;font-weight:700;">Proyecto aprobado</p>
      <p style="margin:0;font-size:15px;color:#1A1A1A;font-weight:600;">${project.title}</p>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${trackUrl}" style="display:inline-block;background:#CC5200;color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 32px;border-radius:8px;">Ver estado del proyecto</a>
    </div>
    <p style="font-size:12px;color:#999;">Código de seguimiento: <strong>${project.tracking_code}</strong></p>`;
  return wrap(body);
}

/* ── Email: correcciones solicitadas ──────────────────────────── */
export function buildCorrectionsEmail(
  project: { title: string; researcher_name: string; tracking_code: string | null },
  correctionsByReviewer: { reviewer_name: string; sections: { label: string; standardComments: string[]; customComment: string }[] }[],
  origin: string,
) {
  const trackUrl = `${origin}/track/${project.tracking_code}`;

  const sections = correctionsByReviewer.map(r => {
    const sectionHtml = r.sections.map(s => `
      <div style="margin-bottom:12px;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1A1A1A;">📌 ${s.label}</p>
        ${s.standardComments.map(c => `<p style="margin:2px 0 2px 16px;font-size:13px;color:#555;">• ${c}</p>`).join("")}
        ${s.customComment ? `<p style="margin:4px 0 0 16px;font-size:13px;color:#555;font-style:italic;">"${s.customComment}"</p>` : ""}
      </div>`).join("");
    return `
      <div style="background:#fff8f5;border-radius:8px;padding:20px;border-left:4px solid #CC5200;margin-bottom:16px;">
        <p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#CC5200;text-transform:uppercase;letter-spacing:1px;">Observaciones de ${r.reviewer_name}</p>
        ${sectionHtml}
      </div>`;
  }).join("");

  const body = `
    <p style="font-size:16px;font-weight:700;color:#1A1A1A;margin:0 0 8px;">Tu proyecto tiene observaciones</p>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Estimada/o <strong>${project.researcher_name}</strong>, los revisores del Comité de Ética han solicitado correcciones para tu proyecto. Por favor revisa las observaciones e incorpora los cambios requeridos.
    </p>
    <div style="background:#f9f9f9;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:#888;">Proyecto: <strong style="color:#1A1A1A;">${project.title}</strong></p>
    </div>
    <p style="font-size:13px;font-weight:700;color:#1A1A1A;margin:0 0 12px;">Correcciones solicitadas:</p>
    ${sections}
    <div style="text-align:center;margin-top:24px;">
      <a href="${trackUrl}" style="display:inline-block;background:#CC5200;color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 32px;border-radius:8px;">Subir correcciones</a>
    </div>`;
  return wrap(body);
}

/* ── Email: investigador resubmitió ──────────────────────────── */
export function buildResubmitNotificationEmail(
  project: { title: string; researcher_name: string },
  reviewerName: string,
) {
  const body = `
    <p style="font-size:16px;font-weight:700;color:#1A1A1A;margin:0 0 8px;">El investigador incorporó correcciones</p>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Estimada/o <strong>${reviewerName}</strong>, el investigador ha subido una versión corregida del siguiente proyecto y requiere una nueva revisión de su parte.
    </p>
    <div style="background:#f9f9f9;border-radius:8px;padding:20px;border-left:4px solid #CC5200;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;font-weight:700;">Proyecto</p>
      <p style="margin:0 0 4px;font-size:15px;color:#1A1A1A;font-weight:600;">${project.title}</p>
      <p style="margin:0;font-size:13px;color:#888;">Investigador/a: ${project.researcher_name}</p>
    </div>
    <p style="font-size:13px;color:#555;">Ingresa al <strong>Panel de Revisores</strong> para iniciar la nueva ronda de revisión.</p>`;
  return wrap(body);
}

/* ── Email: solicitud carta de ética a Macarena ──────────────── */
export function buildMacarenaEmail(project: {
  id: string;
  title: string;
  researcher_name: string;
  researcher_rut: string | null;
  researcher_email: string;
}, origin: string, certToken: string) {
  const firstName  = project.researcher_name.split(" ")[0];
  const rutText    = project.researcher_rut ? ` (${project.researcher_rut})` : "";
  const confirmUrl = `${origin}/api/certify?id=${project.id}&token=${certToken}`;
  const body = `
    <p style="color:#555;font-size:14px;line-height:1.8;margin:0 0 20px;">
      Estimada Macarena,
    </p>
    <p style="color:#555;font-size:14px;line-height:1.8;margin:0 0 20px;">
      Junto con saludarte y esperando que te encuentres muy bien, te escribo como miembro del Comité de Ética de nuestra Escuela, para solicitar un certificado de aprobación de ética para el proyecto <strong>"${project.title}"</strong>, a cargo de la investigadora/or <strong>${project.researcher_name}</strong>${rutText}.
    </p>
    <p style="color:#555;font-size:14px;line-height:1.8;margin:0 0 20px;">
      El proyecto fue revisado por el comité ético científico de la Escuela de Psicología y no presenta riesgos para los participantes, además de tomar todos los resguardos éticos necesarios.
    </p>
    <p style="color:#555;font-size:14px;line-height:1.8;margin:0 0 24px;">
      ¿Podrían, por favor, emitir el certificado para ${firstName}? Copio a ${firstName} en este correo con el fin de agilizar los tiempos dado que tiene que tramitarlo para avanzar en su campo.
    </p>
    <div style="background:#f5f0ff;border-radius:10px;padding:20px;border-left:4px solid #7c3aed;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:13px;color:#555;line-height:1.6;">Una vez que hayas enviado el certificado, por favor confirma haciendo clic en el botón:</p>
      <div style="text-align:center;">
        <a href="${confirmUrl}" style="display:inline-block;background:#7c3aed;color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 28px;border-radius:8px;">✓ Confirmar envío del certificado</a>
      </div>
    </div>
    <p style="color:#555;font-size:14px;line-height:1.8;margin:0;">
      Te envío un saludo afectuoso y que tengas una excelente semana.
    </p>`;
  return wrap(body);
}

/* ── Email: notificación al coordinador ──────────────────────── */
export function buildCoordinatorApprovalEmail(project: {
  title: string;
  researcher_name: string;
  researcher_email: string;
  project_type: string;
}) {
  const body = `
    <p style="font-size:16px;font-weight:700;color:#1A1A1A;margin:0 0 8px;">Proyecto aprobado por ambos revisores</p>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px;">
      El siguiente proyecto ha recibido aprobación unánime del Comité de Ética y está listo para continuar.
    </p>
    <div style="background:#f0fdf4;border-radius:8px;padding:20px;border-left:4px solid #22c55e;margin-bottom:16px;">
      <p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;font-weight:700;">Proyecto aprobado</p>
      <p style="margin:0 0 6px;font-size:15px;color:#1A1A1A;font-weight:600;">${project.title}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#555;">Investigador/a: <strong>${project.researcher_name}</strong></p>
      <p style="margin:0 0 4px;font-size:13px;color:#555;">Correo: ${project.researcher_email}</p>
      <p style="margin:0;font-size:13px;color:#555;">Tipo: ${project.project_type}</p>
    </div>`;
  return wrap(body);
}
