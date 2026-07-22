import type { Session } from "./auth";

/** Documentos que sube el revisor para el investigador, no el investigador. */
export const REVIEWER_DOC_TYPES = ["review_feedback"];

/**
 * Estados en los que el investigador todavía puede tocar sus documentos.
 *
 * Fuera de estos, el expediente está congelado: si pudiera reemplazar el
 * protocolo mientras dos revisores lo evalúan, o después de aprobado, lo que
 * el comité aprobó dejaría de ser lo que hay en el expediente.
 */
export const ESTADOS_EDITABLES = ["submitted", "corrections"];

export type DocLike = {
  doc_type: string;
  uploaded_by?: string | null;
  archived_at?: string | null;
};

export type ProjectLike = {
  researcher_email?: string | null;
  status?: string | null;
};

/**
 * ¿Puede esta sesión eliminar o reemplazar este documento?
 *
 * Cada uno gestiona lo suyo; la coordinación, todo. Nunca se decide con datos
 * que venga del cliente: `session` sale de la cookie firmada y `doc`/`project`
 * se leen de la base en el propio endpoint.
 */
export function canManageDocument(
  session: Session,
  project: ProjectLike,
  doc: DocLike,
): boolean {
  // Un documento archivado ya no se toca: es el registro histórico.
  if (doc.archived_at) return false;

  // Coordinación: todo.
  if (session.role === "admin") return true;

  const esDeRevisor = REVIEWER_DOC_TYPES.includes(doc.doc_type);

  if (session.role === "investigador") {
    if (esDeRevisor) return false; // los comentarios del revisor no son suyos
    if (project.researcher_email?.toLowerCase() !== session.email) return false;
    return ESTADOS_EDITABLES.includes(project.status ?? "");
  }

  // Revisor o miembro del comité: solo los documentos con comentarios que
  // subió esta misma persona. Los antiguos no registran autor: en ese caso
  // no se puede saber de quién son y solo la coordinación puede tocarlos.
  if (session.role === "revisor" || session.role === "comite") {
    if (!esDeRevisor) return false;
    return !!doc.uploaded_by && doc.uploaded_by.toLowerCase() === session.email;
  }

  return false;
}

/** Motivo legible de por qué no se puede gestionar, para la UI y los errores. */
export function razonBloqueo(
  session: Session,
  project: ProjectLike,
  doc: DocLike,
): string | null {
  if (canManageDocument(session, project, doc)) return null;
  if (doc.archived_at) return "El documento está archivado.";
  if (session.role === "investigador") {
    if (REVIEWER_DOC_TYPES.includes(doc.doc_type)) return "Este documento lo subió el revisor.";
    if (project.researcher_email?.toLowerCase() !== session.email) return "El proyecto no es tuyo.";
    return "El proyecto ya está en revisión: pide el cambio a la coordinación.";
  }
  if (session.role === "revisor" || session.role === "comite") {
    return "Solo puedes gestionar los documentos que subiste tú.";
  }
  return "No autorizado.";
}
