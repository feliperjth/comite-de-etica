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
