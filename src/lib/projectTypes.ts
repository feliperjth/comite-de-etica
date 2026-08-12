/**
 * Tipos de proyecto: única fuente de verdad.
 *
 * El formulario de /submit, el validador de la API y las etiquetas de los
 * correos leen de aquí. Cuando estas listas vivían duplicadas, el validador
 * quedó desfasado y rechazaba "docente" y "externo" con "Tipo de proyecto no
 * reconocido", perdiendo el envío completo del investigador.
 */

/** Etiquetas legibles, en el orden en que se muestran en el formulario. */
export const PROJECT_TYPE_LABELS = {
  pregrado:  "Tesis de pregrado",
  magister:  "Tesis de magíster",
  doctorado: "Tesis de doctorado",
  docente:   "Proyecto de investigación docente",
  fondecyt:  "Proyecto Fondecyt",
  externo:   "Consultoría / Estudio externo",
} as const;

export type ProjectType = keyof typeof PROJECT_TYPE_LABELS;

export const PROJECT_TYPES = Object.keys(PROJECT_TYPE_LABELS) as ProjectType[];

/** Tipos que corresponden a una tesis (llevan profesor/a guía). */
export const THESIS_TYPES: ProjectType[] = ["pregrado", "magister", "doctorado"];

export function isProjectType(v: string): v is ProjectType {
  return (PROJECT_TYPES as string[]).includes(v);
}

export function isThesisType(v: string): boolean {
  return (THESIS_TYPES as string[]).includes(v);
}

/** Etiqueta legible; si el valor es desconocido devuelve el valor crudo. */
export function projectTypeLabel(v: string | null | undefined): string {
  if (!v) return "—";
  return isProjectType(v) ? PROJECT_TYPE_LABELS[v] : v;
}
