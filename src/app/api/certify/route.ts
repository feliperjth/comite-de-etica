import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseServer } from "@/lib/supabase";
import crypto from "crypto";

export function generateCertToken(projectId: string): string {
  const secret = process.env.CERT_SECRET ?? "cert-secret-fallback";
  return crypto.createHmac("sha256", secret).update(projectId).digest("hex");
}

// ── GET: Show upload form (or "already certified" message) ───────────────────

export async function GET(req: NextRequest) {
  const id    = req.nextUrl.searchParams.get("id");
  const token = req.nextUrl.searchParams.get("token");

  if (!id || !token) return new NextResponse("Enlace inválido.", { status: 400 });

  const expected = generateCertToken(id);
  if (token !== expected) return new NextResponse("Token inválido.", { status: 403 });

  const supabase = getSupabaseServer();
  const { data: project } = await supabase
    .from("projects")
    .select("id, title, status, certificate_url")
    .eq("id", id)
    .single();

  if (!project) return new NextResponse("Proyecto no encontrado.", { status: 404 });

  if (project.status === "certified") {
    return new NextResponse(alreadyCertifiedPage(project.title, project.certificate_url), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new NextResponse(uploadPage(id, token, project.title), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// ── POST: Receive uploaded certificate, store it, mark project certified ──────

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const id       = formData.get("id")    as string | null;
  const token    = formData.get("token") as string | null;
  const file     = formData.get("file")  as File   | null;

  if (!id || !token) {
    return new NextResponse("Parámetros inválidos.", { status: 400 });
  }

  const expected = generateCertToken(id);
  if (token !== expected) {
    return new NextResponse("Token inválido.", { status: 403 });
  }

  if (!file || file.size === 0) {
    return new NextResponse(uploadPage(id, token, "", "Debes seleccionar el archivo PDF del certificado."), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const supabase      = getSupabaseServer();
  const supabaseAdmin = getSupabaseAdmin();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, status")
    .eq("id", id)
    .single();

  if (!project) return new NextResponse("Proyecto no encontrado.", { status: 404 });

  const ext  = file.name.split(".").pop() ?? "pdf";
  const path = `${id}/certificate.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("certificates")
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true });

  if (uploadError) {
    return new NextResponse(uploadPage(id, token, project.title, `Error al subir: ${uploadError.message}`), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const { data: urlData } = supabaseAdmin.storage.from("certificates").getPublicUrl(path);
  const certificateUrl = urlData.publicUrl;

  await supabaseAdmin
    .from("projects")
    .update({ status: "certified", progress: 100, certificate_url: certificateUrl })
    .eq("id", id);

  return new NextResponse(successPage(project.title, certificateUrl), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

const baseStyle = `
  <style>
    * { box-sizing: border-box; }
    body { margin:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
           background:#f1f5f9; display:flex; align-items:center; justify-content:center; min-height:100vh; padding:16px; }
    .card { background:#fff; border-radius:20px; box-shadow:0 4px 24px rgba(0,0,0,0.08); padding:48px 40px;
            max-width:520px; width:100%; text-align:center; }
    .icon { font-size:48px; margin-bottom:16px; }
    .tag  { display:inline-block; background:#7c3aed; color:#fff; font-size:11px; font-weight:700;
            letter-spacing:2px; text-transform:uppercase; padding:4px 14px; border-radius:20px; margin-bottom:24px; }
    h1   { font-size:22px; color:#1a1a1a; margin:0 0 8px; font-weight:800; }
    .subtitle { font-size:13px; color:#888; margin:0 0 28px; font-style:italic; }
    p    { font-size:14px; color:#555; line-height:1.7; margin:0 0 16px; text-align:left; }
    .file-label { display:block; border:2px dashed #c4b5fd; border-radius:12px; padding:24px 20px;
                  color:#7c3aed; font-weight:600; font-size:14px; cursor:pointer;
                  transition:background 0.2s; margin-bottom:8px; }
    .file-label:hover { background:#f5f3ff; }
    input[type=file] { display:none; }
    #file-name { font-size:12px; color:#888; margin-bottom:20px; min-height:18px; }
    .btn { display:inline-block; width:100%; background:#7c3aed; color:#fff; font-weight:700;
           font-size:15px; text-decoration:none; padding:14px 28px; border-radius:12px;
           border:none; cursor:pointer; transition:background 0.2s; }
    .btn:hover { background:#6d28d9; }
    .btn:disabled { opacity:0.5; cursor:not-allowed; }
    .btn-dl { background:#22c55e; }
    .btn-dl:hover { background:#16a34a; }
    .error { background:#fef2f2; border:1px solid #fecaca; color:#dc2626; font-size:13px;
             border-radius:10px; padding:12px 16px; margin-bottom:20px; text-align:center; }
    .success-icon { font-size:56px; margin-bottom:12px; }
  </style>`;

function uploadPage(id: string, token: string, title: string, errorMsg?: string) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Subir certificado · Comité de Ética UAI</title>
${baseStyle}
</head><body>
<div class="card">
  <div class="icon">🎓</div>
  <div class="tag">Comité de Ética UAI</div>
  <h1>Subir certificado de ética</h1>
  ${title ? `<p class="subtitle">"${title}"</p>` : ""}
  <p>Por favor adjunta el certificado de aprobación ética emitido para este proyecto. Al confirmar, quedará registrado en el portal y disponible para el/la investigador/a.</p>
  ${errorMsg ? `<div class="error">${errorMsg}</div>` : ""}
  <form method="POST" action="/api/certify" enctype="multipart/form-data" onsubmit="handleSubmit(event)">
    <input type="hidden" name="id" value="${id}">
    <input type="hidden" name="token" value="${token}">
    <input type="file" name="file" id="cert-file" accept=".pdf,application/pdf"
           onchange="document.getElementById('file-name').textContent = this.files[0]?.name ?? ''">
    <label class="file-label" for="cert-file">
      📄 Seleccionar PDF del certificado
    </label>
    <div id="file-name"></div>
    <button type="submit" class="btn" id="submit-btn">✓ Confirmar y subir certificado</button>
  </form>
</div>
<script>
function handleSubmit(e) {
  const f = document.getElementById('cert-file');
  if (!f.files || f.files.length === 0) {
    e.preventDefault();
    document.getElementById('file-name').textContent = '⚠ Debes seleccionar un archivo primero.';
    return;
  }
  document.getElementById('submit-btn').disabled = true;
  document.getElementById('submit-btn').textContent = 'Subiendo…';
}
</script>
</body></html>`;
}

function successPage(title: string, certificateUrl: string) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Certificado subido · Comité de Ética UAI</title>
${baseStyle}
</head><body>
<div class="card">
  <div class="success-icon">✅</div>
  <div class="tag">Comité de Ética UAI</div>
  <h1>Certificado registrado</h1>
  <p class="subtitle">"${title}"</p>
  <p style="text-align:center;">El certificado fue subido correctamente. El/la investigador/a ya puede descargarlo desde su portal.</p>
  <a href="${certificateUrl}" target="_blank" class="btn btn-dl" style="margin-top:8px;">
    📥 Descargar certificado
  </a>
</div>
</body></html>`;
}

function alreadyCertifiedPage(title: string, certificateUrl: string | null) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Certificado ya registrado · Comité de Ética UAI</title>
${baseStyle}
</head><body>
<div class="card">
  <div class="icon">🎓</div>
  <div class="tag">Comité de Ética UAI</div>
  <h1>Ya certificado</h1>
  <p class="subtitle">"${title}"</p>
  <p style="text-align:center;">Este proyecto ya fue marcado como certificado.</p>
  ${certificateUrl ? `<a href="${certificateUrl}" target="_blank" class="btn btn-dl" style="margin-top:8px;">📥 Ver certificado</a>` : ""}
</div>
</body></html>`;
}
