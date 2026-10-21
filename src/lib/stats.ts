import { getSupabaseAdmin } from "./supabase";

/** Tiempo promedio de revisión que se muestra en la portada, en días. */
const TIEMPO_PROMEDIO_DIAS = 25;

export type HomeStat = { value: string; label: string };

/** Estados en los que el comité ya emitió una decisión sobre el proyecto. */
const RESUELTOS  = ["approved", "certified", "rejected"];
const APROBADOS  = ["approved", "certified"];

/**
 * Cifras reales para la portada. Antes estaban escritas a mano ("120+
 * proyectos", "94% de aprobación") y no correspondían a nada.
 *
 * Cada tile se omite si su dato no existe todavía, en vez de mostrar un cero
 * o una estimación: una portada con tres cifras ciertas dice más que cuatro
 * donde una está inventada.
 */
export async function getHomeStats(): Promise<HomeStat[]> {
  const supabase = getSupabaseAdmin();

  const [proyectos, revisores] = await Promise.all([
    supabase.from("projects").select("status, created_at, decided_at"),
    supabase.from("reviewers").select("id"),
  ]);

  const stats: HomeStat[] = [];

  const rows = proyectos.data ?? [];
  if (rows.length > 0) {
    stats.push({ value: String(rows.length), label: rows.length === 1 ? "Proyecto recibido" : "Proyectos recibidos" });

    // Tasa sobre los resueltos, no sobre el total: los que siguen en revisión
    // todavía no son un "no" y contarlos hundiría el porcentaje.
    const resueltos = rows.filter(p => RESUELTOS.includes(p.status));
    if (resueltos.length > 0) {
      const aprobados = resueltos.filter(p => APROBADOS.includes(p.status)).length;
      stats.push({
        value: `${Math.round((aprobados / resueltos.length) * 100)}%`,
        label: "Tasa de aprobación",
      });
    }

    // Cifra fija definida por el comité (antes se calculaba con decided_at).
    stats.push({ value: `${TIEMPO_PROMEDIO_DIAS} días`, label: "Tiempo promedio de revisión" });
  }

  const nRevisores = revisores.data?.length ?? 0;
  if (nRevisores > 0) {
    stats.push({ value: String(nRevisores), label: nRevisores === 1 ? "Revisor" : "Revisores" });
  }

  return stats;
}
