/** Etiquetas legibles para cada tipo de documento del proyecto. */
export const DOC_TYPE_LABELS: Record<string, string> = {
  protocol:    "Protocolo de investigación",
  consent:     "Consentimiento informado",
  assent:      "Asentimiento informado",
  instruments: "Instrumentos / tests a utilizar",
  otros:       "Documento adicional",
  revision:    "Documento corregido (reenvío)",
  review_feedback: "Comentarios de revisión",
};

/**
 * Casillas del reenvío de correcciones, en el orden en que se pintan.
 *
 * Son las mismas categorías del envío inicial: así la corrección entra al
 * expediente etiquetada ("Protocolo de investigación · Segunda ronda") en vez
 * de como un `revision` genérico que no dice qué se corrigió. Ninguna es
 * obligatoria por separado — se corrige lo que el revisor pidió — pero hay que
 * mandar al menos un archivo.
 *
 * `otros` es la válvula de escape: acepta varios archivos para lo que no cabe
 * en las categorías fijas (una carta de autorización del colegio, un anexo
 * nuevo, la carta de respuesta a los revisores).
 */
export const TIPOS_REENVIO = ["protocol", "consent", "assent", "instruments"] as const;

/** Tipo bajo el que entran los archivos de la casilla libre. */
export const TIPO_ADICIONAL = "otros";

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
