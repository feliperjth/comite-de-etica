import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import crypto from "crypto";

export function generateCertToken(projectId: string): string {
  const secret = process.env.CERT_SECRET ?? "cert-secret-fallback";
  return crypto.createHmac("sha256", secret).update(projectId).digest("hex");
}

export async function GET(req: NextRequest) {
  const id    = req.nextUrl.searchParams.get("id");
  const token = req.nextUrl.searchParams.get("token");

  if (!id || !token) {
    return new NextResponse("Enlace inválido.", { status: 400 });
  }

  const expected = generateCertToken(id);
  if (token !== expected) {
    return new NextResponse("Token inválido.", { status: 403 });
  }

  const supabase = getSupabase();
  const { data: project } = await supabase
    .from("projects")
    .select("id, title, status")
    .eq("id", id)
    .single();

  if (!project) {
    return new NextResponse("Proyecto no encontrado.", { status: 404 });
  }

  if (project.status === "certified") {
    return new NextResponse(confirmPage(project.title, true), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  await supabase
    .from("projects")
    .update({ status: "certified", progress: 100 })
    .eq("id", id);

  return new NextResponse(confirmPage(project.title, false), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function confirmPage(title: string, alreadyCertified: boolean) {
  const message = alreadyCertified
    ? "Este proyecto ya había sido marcado como certificado."
    : "El estado del proyecto ha sido actualizado a <strong>Certificado</strong>.";

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Certificado confirmado · Comité de Ética UAI</title>
<style>
  body { margin:0; font-family: Arial, sans-serif; background:#f5f5f5; display:flex; align-items:center; justify-content:center; min-height:100vh; }
  .card { background:#fff; border-radius:16px; box-shadow:0 2px 16px rgba(0,0,0,0.08); padding:48px 40px; max-width:480px; text-align:center; }
  .icon { font-size:48px; margin-bottom:16px; }
  .tag { display:inline-block; background:#6d28d9; color:#fff; font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; padding:4px 12px; border-radius:20px; margin-bottom:24px; }
  h1 { font-size:20px; color:#1a1a1a; margin:0 0 12px; }
  p { font-size:14px; color:#555; line-height:1.7; margin:0 0 8px; }
  .title { font-style:italic; color:#333; }
</style>
</head><body>
<div class="card">
  <div class="icon">🎓</div>
  <div class="tag">Comité de Ética UAI</div>
  <h1>Certificado confirmado</h1>
  <p>${message}</p>
  <p class="title">"${title}"</p>
</div>
</body></html>`;
}
