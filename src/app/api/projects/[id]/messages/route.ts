import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const email =
    req.cookies.get("comite_email")?.value ||
    req.cookies.get("reviewer_email")?.value ||
    req.cookies.get("investigador_email")?.value;

  if (!email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("project_messages")
    .select("id, sender_type, body, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });

  const supabase = getSupabaseAdmin();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, researcher_email, reviewer, reviewer2")
    .eq("id", id)
    .single();
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const reviewerEmail     = req.cookies.get("reviewer_email")?.value;
  const comiteEmail       = req.cookies.get("comite_email")?.value;
  const investigadorEmail = req.cookies.get("investigador_email")?.value;

  let senderType: string;

  if (investigadorEmail) {
    if (project.researcher_email !== investigadorEmail) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    senderType = "investigador";
  } else if (reviewerEmail || comiteEmail) {
    const rEmail = reviewerEmail || comiteEmail!;
    const { data: reviewer } = await supabase
      .from("reviewers")
      .select("name")
      .eq("email", rEmail)
      .maybeSingle();

    const name = reviewer?.name;
    if (name && project.reviewer === name) {
      senderType = "revisor1";
    } else if (name && project.reviewer2 === name) {
      senderType = "revisor2";
    } else {
      senderType = "revisor1";
    }
  } else {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: msg, error } = await supabase
    .from("project_messages")
    .insert({ project_id: id, sender_type: senderType, body: body.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify by email
  if (senderType === "investigador") {
    for (const name of [project.reviewer, project.reviewer2].filter(Boolean) as string[]) {
      const { data: rv } = await supabase
        .from("reviewers").select("email").eq("name", name).maybeSingle();
      if (rv?.email) {
        sendEmail(
          rv.email,
          `Nuevo mensaje sobre proyecto · ${project.title}`,
          buildReviewerMsgEmail(project.title, body.trim()),
        ).catch(() => {});
      }
    }
  } else {
    const label = senderType === "revisor1" ? "Revisor 1" : "Revisor 2";
    if (project.researcher_email) {
      sendEmail(
        project.researcher_email,
        `${label} ha respondido · ${project.title}`,
        buildInvestigadorReplyEmail(project.title, body.trim(), label),
      ).catch(() => {});
    }
  }

  return NextResponse.json({ message: msg });
}

function buildReviewerMsgEmail(title: string, body: string) {
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

function buildInvestigadorReplyEmail(title: string, body: string, label: string) {
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
  <p style="font-size:14px;color:#555;"><strong>${label}</strong> ha respondido tu mensaje sobre:</p>
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
