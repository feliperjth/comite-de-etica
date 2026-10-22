import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";
import { guardarNoDisponibles, leerNoDisponibles } from "@/lib/assignmentServer";

/** Marca a un revisor como disponible o no para recibir proyectos nuevos. */
export async function PATCH(req: NextRequest) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const { email, available } = await req.json().catch(() => ({}));
  if (!email || typeof available !== "boolean") {
    return NextResponse.json({ error: "Faltan parámetros." }, { status: 400 });
  }
  const supabase = getSupabaseAdmin();
  const actual = await leerNoDisponibles(supabase);
  const e = String(email).trim().toLowerCase();
  const nueva = available ? actual.filter((x) => x !== e) : [...actual, e];
  try {
    await guardarNoDisponibles(supabase, nueva);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
  return NextResponse.json({ ok: true, noDisponibles: await leerNoDisponibles(supabase) });
}
