import type { SupabaseClient } from "@supabase/supabase-js";
import { calcularPlazo, enPlazoDeRevision, type Plazo, type ProyectoPlazo } from "@/lib/deadlines";

/**
 * Plazo de la ronda actual de varios proyectos, con dos consultas en total.
 * Solo para los que están en revisión (enviado / en revisión); el resto no
 * tiene plazo corriendo.
 */
export async function plazosDeProyectos(
  supabase: SupabaseClient,
  projects: (ProyectoPlazo & { id: string })[],
  ahora = Date.now(),
): Promise<Record<string, Plazo>> {
  const activos = projects.filter((p) => enPlazoDeRevision(p.status));
  if (activos.length === 0) return {};
  const ids = activos.map((p) => p.id);

  const [{ data: docs }, { data: reviews }] = await Promise.all([
    supabase
      .from("documents")
      .select("project_id, file_path, created_at")
      .in("project_id", ids)
      .like("file_path", "%/revision-%"),
    supabase
      .from("reviews")
      .select("project_id, round, submitted_at")
      .in("project_id", ids),
  ]);

  const out: Record<string, Plazo> = {};
  for (const p of activos) {
    out[p.id] = calcularPlazo(
      p,
      (docs ?? []).filter((d) => d.project_id === p.id),
      (reviews ?? []).filter((r) => r.project_id === p.id),
      ahora,
    );
  }
  return out;
}
