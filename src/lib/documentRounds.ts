import { REVIEWER_DOC_TYPES } from "./documentAccess";

/**
 * A qué ronda pertenece cada documento y quién lo puso ahí.
 *
 * La ronda no está en una columna: vive en la ruta de Storage, que es donde la
 * dejaron los flujos de subida.
 *
 *   {projectId}/review-feedback/r2/...  → comentarios del revisor, ronda 2
 *   {projectId}/revision-2/...          → reenvío del investigador para la 2
 *   {projectId}/protocol/...            → envío inicial, ronda 1
 *
 * Se deduce en un solo sitio para que el panel, el endpoint y el correo no
 * discrepen sobre a qué ronda pertenece un archivo.
 */

export type GrupoDocumento = "investigador" | "revisor";

export type DocConRuta = {
  doc_type: string;
  file_path?: string | null;
};

export function grupoDeDocumento(doc: DocConRuta): GrupoDocumento {
  return REVIEWER_DOC_TYPES.includes(doc.doc_type) ? "revisor" : "investigador";
}

/** Ronda a la que pertenece el documento. Sin pistas en la ruta, la 1. */
export function rondaDeDocumento(doc: DocConRuta): number {
  const ruta = doc.file_path ?? "";
  const m = ruta.match(/\/review-feedback\/r(\d+)\//) ?? ruta.match(/\/revision-(\d+)\//);
  const n = m ? Number(m[1]) : 1;
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

const ORDINALES = ["", "Primera", "Segunda", "Tercera", "Cuarta", "Quinta", "Sexta"];

export function etiquetaRonda(ronda: number): string {
  return ORDINALES[ronda] ? `${ORDINALES[ronda]} ronda` : `Ronda ${ronda}`;
}

/** Encabezado del bloque del investigador: la 1 es el envío original. */
export function etiquetaRondaInvestigador(ronda: number): string {
  return ronda <= 1 ? "Envío inicial" : `Reenvío · ${etiquetaRonda(ronda).toLowerCase()}`;
}

export function etiquetaRondaRevisor(ronda: number): string {
  return `${etiquetaRonda(ronda)} de revisión`;
}

/** Carpeta de Storage en la que vive el documento, sin el nombre del archivo. */
export function carpetaDe(filePath: string | null | undefined): string | null {
  if (!filePath) return null;
  const corte = filePath.lastIndexOf("/");
  return corte > 0 ? filePath.slice(0, corte) : null;
}

type ProyectoConEstado = {
  status?: string | null;
  current_round?: number | null;
};

/**
 * ¿El investigador ya tiene en su expediente los comentarios de esta ronda?
 *
 * Solo entonces tiene sentido avisarle de que un revisor sustituyó el archivo:
 * si el revisor lo corrige antes de cerrar su evaluación, el investigador nunca
 * llegó a ver la versión anterior y el correo sería ruido.
 */
export function feedbackYaEntregado(proyecto: ProyectoConEstado, ronda: number): boolean {
  const actual = proyecto.current_round ?? 1;
  if (ronda < actual) return true; // ronda cerrada: se envió al pasar a la siguiente
  return ["corrections", "approved", "rejected", "certified"].includes(proyecto.status ?? "");
}

/**
 * ¿Reemplazar este documento debe avisar por correo al investigador?
 *
 * Solo los comentarios de revisión, y solo si ya los recibió.
 */
export function reemplazoAvisaAlInvestigador(
  proyecto: ProyectoConEstado,
  doc: DocConRuta,
): boolean {
  if (grupoDeDocumento(doc) !== "revisor") return false;
  return feedbackYaEntregado(proyecto, rondaDeDocumento(doc));
}
