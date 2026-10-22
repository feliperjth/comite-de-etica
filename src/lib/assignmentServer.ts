import type { SupabaseClient } from "@supabase/supabase-js";
import { proponerAsignaciones, type Propuesta, type ProyectoBase, type RevisorBase } from "@/lib/assignment";

/**
 * Datos para la asignación automática: revisores, proyectos y quiénes están
 * marcados como no disponibles. La disponibilidad se guarda en `app_settings`
 * (clave `reviewers_unavailable`, lista JSON de correos), así no hace falta
 * una columna nueva en `reviewers`.
 */

export const CLAVE_NO_DISPONIBLES = "reviewers_unavailable";
export const CLAVE_MODO = "reviewer_assignment_mode";

const CAMPOS_PROYECTO =
  "id, title, status, theme, reviewer, reviewer2, researcher_name, researcher_email, advisor_name, created_at, fast_track, fast_track_deadline, current_round, tracking_code";

export async function leerNoDisponibles(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase.from("app_settings").select("value").eq("key", CLAVE_NO_DISPONIBLES).maybeSingle();
  try {
    const lista = JSON.parse(data?.value ?? "[]");
    return Array.isArray(lista) ? lista.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function guardarNoDisponibles(supabase: SupabaseClient, emails: string[]): Promise<void> {
  const unicos = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: CLAVE_NO_DISPONIBLES, value: JSON.stringify(unicos), updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

export async function datosAsignacion(supabase: SupabaseClient): Promise<{
  revisores: (RevisorBase & { id?: string })[];
  proyectos: (ProyectoBase & { current_round?: number | null; tracking_code?: string | null })[];
  noDisponibles: string[];
}> {
  const [{ data: revisores, error: e1 }, { data: proyectos, error: e2 }, noDisponibles] = await Promise.all([
    supabase.from("reviewers").select("id, name, email, expertise"),
    supabase.from("projects").select(CAMPOS_PROYECTO).neq("status", "draft"),
    leerNoDisponibles(supabase),
  ]);
  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);
  return { revisores: revisores ?? [], proyectos: proyectos ?? [], noDisponibles };
}

export async function propuestasActuales(supabase: SupabaseClient): Promise<{
  propuestas: Propuesta[];
  noDisponibles: string[];
}> {
  const { revisores, proyectos, noDisponibles } = await datosAsignacion(supabase);
  return { propuestas: proponerAsignaciones({ proyectos, revisores, noDisponibles }), noDisponibles };
}

/** Dominio oficial del portal, para los enlaces de los correos. */
export function urlDelSitio(fallback: string): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : fallback)
  );
}
