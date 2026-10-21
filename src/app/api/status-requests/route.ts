import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { requireStaff } from "@/lib/auth";
import { CONSULTA_PREFIJO, ultimaConsulta } from "@/lib/statusRequest";

/**
 * Proyectos con una consulta de estado del investigador/a que ningún revisor
 * ha respondido todavía. Lo usa el panel de revisores para marcarlos.
 */
export async function GET(req: NextRequest) {
  const { response } = await requireStaff(req);
  if (response) return response;

  const supabase = getSupabaseServer();

  const { data: consultas, error } = await supabase
    .from("project_messages")
    .select("project_id")
    .eq("sender_type", "investigador")
    .like("body", `${CONSULTA_PREFIJO}%`);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = [...new Set((consultas ?? []).map((c) => c.project_id as string))];
  if (ids.length === 0) return NextResponse.json({ open: [] });

  const { data: mensajes } = await supabase
    .from("project_messages")
    .select("project_id, sender_type, body, created_at")
    .in("project_id", ids);

  const open: { project_id: string; at: string }[] = [];
  for (const id of ids) {
    const u = ultimaConsulta((mensajes ?? []).filter((m) => m.project_id === id));
    if (u && !u.respondida) open.push({ project_id: id, at: u.at });
  }
  return NextResponse.json({ open });
}
