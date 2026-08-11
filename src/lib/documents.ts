/** Etiquetas legibles para cada tipo de documento del proyecto. */
export const DOC_TYPE_LABELS: Record<string, string> = {
  protocol:    "Protocolo de investigación",
  consent:     "Consentimiento informado",
  assent:      "Asentimiento informado",
  instruments: "Instrumentos / tests a utilizar",
  revision:    "Documento corregido (reenvío)",
  review_feedback: "Comentarios de revisión",
};

export function docLabel(docType: string): string {
  return DOC_TYPE_LABELS[docType] ?? docType;
}

/**
 * Fecha de subida en corto, para mostrarla junto al nombre del archivo.
 *
 * Lleva la hora a propósito: dentro de una misma ronda puede haber varias
 * versiones del mismo documento subidas el mismo día, y sin la hora no se
 * distingue cuál es la última.
 *
 * Devuelve null si no hay fecha (documentos anteriores a que se registrara) o
 * si no se puede interpretar, para que quien lo llame simplemente no la pinte.
 */
export function formatFechaDoc(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha.toLocaleString("es-CL", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
