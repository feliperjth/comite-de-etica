/**
 * Vía rápida: proyectos con un plazo muy acotado (tesis u otros concursos
 * tipo licitaciones con fecha de postulación cercana), con acuerdo previo de
 * la coordinación. El investigador/a la solicita al enviar, indica la fecha
 * límite y usa el formulario abreviado en lugar del protocolo completo.
 */

/** Id de la plantilla en el bucket `templates` (y en las listas de documentos). */
export const FAST_TRACK_TEMPLATE_ID = "fast_track";

/** Copia incluida en el sitio, por si aún no se sube una al bucket. */
export const FAST_TRACK_TEMPLATE_FALLBACK = "/plantillas/Formulario_abreviado_via_rapida.docx";

/**
 * Fecha de la copia incluida en el sitio. Si en el bucket hay una versión
 * subida antes de esta fecha, se ofrece la del sitio, que es más nueva; una
 * subida posterior desde el panel de coordinación vuelve a tener prioridad.
 */
export const FAST_TRACK_TEMPLATE_DATE = "2026-10-22T00:00:00Z";

export const FAST_TRACK_LABEL = "Formulario abreviado (vía rápida)";

type ConVia = { fast_track?: boolean | null; fast_track_deadline?: string | null };

/** Días que faltan hasta la fecha límite (negativo si ya pasó). */
export function diasHastaLimite(deadline: string | null | undefined, hoy = new Date()): number | null {
  if (!deadline) return null;
  const [y, m, d] = deadline.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const limite = Date.UTC(y, m - 1, d);
  const base = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((limite - base) / 86400000);
}

export function fechaLimiteLegible(deadline: string | null | undefined): string {
  if (!deadline) return "";
  const [y, m, d] = deadline.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

/** Texto corto para la etiqueta: "Vía rápida · vence en 5 días". */
export function etiquetaViaRapida(p: ConVia): string | null {
  if (!p.fast_track) return null;
  const dias = diasHastaLimite(p.fast_track_deadline);
  if (dias === null) return "Vía rápida";
  if (dias < 0) return "Vía rápida · plazo vencido";
  if (dias === 0) return "Vía rápida · vence hoy";
  return `Vía rápida · vence en ${dias} día${dias !== 1 ? "s" : ""}`;
}

/** Urgente si faltan 7 días o menos. */
export function esUrgente(p: ConVia): boolean {
  const dias = diasHastaLimite(p.fast_track_deadline);
  return !!p.fast_track && dias !== null && dias <= 7;
}
