import { getSupabaseAdmin } from "./supabase";

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

    // Solo los proyectos con decided_at registrado. Los resueltos antes de
    // que existiera la columna no tienen fecha y quedan fuera del promedio.
    const conFecha = rows.filter(p => p.decided_at && p.created_at);
    if (conFecha.length > 0) {
      const dias = conFecha.map(p =>
        (new Date(p.decided_at!).getTime() - new Date(p.created_at).getTime()) / 86_400_000,
      );
      const promedio = Math.round(dias.reduce((a, b) => a + b, 0) / dias.length);
      stats.push({ value: `${promedio} ${promedio === 1 ? "día" : "días"}`, label: "Tiempo promedio de revisión" });
    }
  }

  const nRevisores = revisores.data?.length ?? 0;
  if (nRevisores > 0) {
    stats.push({ value: String(nRevisores), label: nRevisores === 1 ? "Revisor" : "Revisores" });
  }

  return stats;
}
