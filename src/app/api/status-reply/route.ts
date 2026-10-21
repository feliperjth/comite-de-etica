import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { guardarMensajeYAvisar, senderTypeDeRevisor } from "@/lib/messaging";
import { leerEnlaceRespuesta } from "@/lib/statusToken";
import { RESPUESTAS_RAPIDAS, textoRespuestaLibre } from "@/lib/statusRequest";

/**
 * Respuesta de un revisor a una consulta de estado, desde el enlace firmado
 * del correo (sin iniciar sesión). GET muestra a qué responde; POST guarda la
 * respuesta como mensaje del revisor y avisa al investigador/a.
 */

async function contexto(token: string | null) {
  const datos = leerEnlaceRespuesta(token);
  if (!datos) return { error: "El enlace no es válido o ya caducó.", status: 403 as const };

  const supabase = getSupabaseAdmin();
  const { data: project } = await supabase
    .from("projects")
    .select("id, title, researcher_email, reviewer, reviewer2, current_round, status")
    .eq("id", datos.projectId)
    .maybeSingle();
  if (!project) return { error: "Proyecto no encontrado.", status: 404 as const };

  const { data: consulta } = await supabase
    .from("project_messages")
    .select("id, created_at")
    .eq("id", datos.requestId)
    .eq("project_id", project.id)
    .maybeSingle();
  if (!consulta) return { error: "La consulta ya no existe.", status: 404 as const };

  const senderType = senderTypeDeRevisor(project, datos.reviewer);

  // ¿Ya respondió este revisor después de la consulta?
  const { data: posteriores } = await supabase
    .from("project_messages")
    .select("id")
    .eq("project_id", project.id)
    .eq("sender_type", senderType)
    .gt("created_at", consulta.created_at)
    .limit(1);

  return {
    supabase,
    project,
    datos,
    senderType,
    yaRespondio: (posteriores ?? []).length > 0,
  };
}

export async function GET(req: NextRequest) {
  const ctx = await contexto(req.nextUrl.searchParams.get("t"));
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  return NextResponse.json({
    title: ctx.project.title,
    round: ctx.project.current_round ?? 1,
    reviewer: ctx.datos.reviewer,
    alreadyAnswered: ctx.yaRespondio,
    options: RESPUESTAS_RAPIDAS.map((r) => ({ key: r.key, label: r.label, texto: r.texto })),
  });
}

export async function POST(req: NextRequest) {
  const { t, key, text } = await req.json().catch(() => ({}));
  const ctx = await contexto(typeof t === "string" ? t : null);
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  if (ctx.yaRespondio) {
    return NextResponse.json({ error: "Ya respondiste esta consulta." }, { status: 409 });
  }

  const rapida = RESPUESTAS_RAPIDAS.find((r) => r.key === key);
  const libre  = typeof text === "string" ? text.trim() : "";
  if (!rapida && !libre) {
    return NextResponse.json({ error: "Elige una respuesta o escribe un mensaje." }, { status: 400 });
  }
  if (libre.length > 2000) {
    return NextResponse.json({ error: "El mensaje es demasiado largo (máximo 2000 caracteres)." }, { status: 400 });
  }

  const body = rapida ? rapida.texto : textoRespuestaLibre(libre);
  const { error } = await guardarMensajeYAvisar(ctx.supabase, ctx.project, ctx.senderType, body);
  if (error) return NextResponse.json({ error }, { status: 500 });

  return NextResponse.json({ ok: true });
}
