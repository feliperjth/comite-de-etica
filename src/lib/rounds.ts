/**
 * Rondas de revisión: quién debe revisar en cada una y en qué estado está.
 *
 * Regla del comité: cada revisor evalúa de forma individual, y una aprobación
 * es definitiva. Si un revisor aprueba en una ronda y el otro pide
 * correcciones, en las rondas siguientes solo vuelve a revisar quien pidió
 * correcciones; la aprobación del primero se mantiene y cuenta para el cierre.
 *
 * Es lógica pura (sin Supabase) para que la API, el panel del revisor y la
 * página de seguimiento lleguen siempre a la misma conclusión.
 */

export type ReviewDecision = "accepted" | "corrections";

export type ReviewLike = {
  reviewer_name: string;
  round: number;
  overall_decision: ReviewDecision | string;
  is_editorial?: boolean | null;
};

export type ProjectLike = {
  reviewer?: string | null;
  reviewer2?: string | null;
  current_round?: number | null;
};

/** Estado de un revisor en una ronda concreta. */
export type EstadoRonda =
  | "accepted"     // revisó en esta ronda y aprobó
  | "corrections"  // revisó en esta ronda y pidió correcciones
  | "pending"      // le toca y aún no revisa
  | "carried"      // ya había aprobado en una ronda anterior: no necesita revisar
  | "skipped";     // ronda pasada sin revisión individual suya (la cerró la coordinación o fue una revisión grupal antigua)

export type RondaRevisor = { round: number; estado: EstadoRonda };

export type ResumenRevisor = {
  name: string;
  /** Ronda en la que aprobó, si ya aprobó. */
  approvedRound: number | null;
  rondas: RondaRevisor[];
};

function norm(name: string | null | undefined): string {
  return (name ?? "").trim().toLocaleLowerCase("es");
}

/** Los nombres se comparan sin distinguir mayúsculas ni espacios extremos. */
export function mismoNombre(a: string | null | undefined, b: string | null | undefined): boolean {
  return !!norm(a) && norm(a) === norm(b);
}

/** Revisores asignados al proyecto, sin vacíos ni duplicados. */
export function revisoresAsignados(project: ProjectLike): string[] {
  const out: string[] = [];
  for (const n of [project.reviewer, project.reviewer2]) {
    if (n && n.trim() && !out.some((o) => mismoNombre(o, n))) out.push(n);
  }
  return out;
}

function deRevisor(reviews: ReviewLike[], name: string): ReviewLike[] {
  return reviews.filter((r) => !r.is_editorial && mismoNombre(r.reviewer_name, name));
}

/** Ronda en la que el revisor aprobó antes de `round`, o null. */
export function aproboAntesDe(reviews: ReviewLike[], name: string, round: number): number | null {
  const previas = deRevisor(reviews, name)
    .filter((r) => r.round < round && r.overall_decision === "accepted")
    .map((r) => r.round);
  return previas.length ? Math.min(...previas) : null;
}

/** Revisión que el revisor entregó en esa ronda, si la hay. */
export function revisionEnRonda(reviews: ReviewLike[], name: string, round: number): ReviewLike | null {
  return deRevisor(reviews, name).find((r) => r.round === round) ?? null;
}

/**
 * Revisores que deben evaluar en la ronda: los asignados que aún no han
 * aprobado en una ronda anterior.
 */
export function revisoresRequeridos(project: ProjectLike, reviews: ReviewLike[], round: number): string[] {
  return revisoresAsignados(project).filter((n) => aproboAntesDe(reviews, n, round) === null);
}

/** Requeridos que todavía no entregan su revisión de la ronda. */
export function revisoresPendientes(project: ProjectLike, reviews: ReviewLike[], round: number): string[] {
  return revisoresRequeridos(project, reviews, round).filter((n) => !revisionEnRonda(reviews, n, round));
}

export type CierreRonda =
  | { cerrada: false; pendientes: string[] }
  | { cerrada: true; aprobado: boolean };

/**
 * ¿La ronda ya puede cerrarse? Se cierra cuando todos los requeridos
 * entregaron; se aprueba si todos ellos aprobaron (las aprobaciones de rondas
 * anteriores ya cuentan, por eso esos revisores no son requeridos).
 */
export function evaluarCierre(project: ProjectLike, reviews: ReviewLike[], round: number): CierreRonda {
  let requeridos = revisoresRequeridos(project, reviews, round);
  // Sin revisores asignados (caso anómalo), basta con quien haya revisado:
  // es lo que hacía el cierre anterior con "1 revisor necesario".
  if (revisoresAsignados(project).length === 0) {
    requeridos = reviews
      .filter((r) => !r.is_editorial && r.round === round)
      .map((r) => r.reviewer_name);
  }
  const pendientes = requeridos.filter((n) => !revisionEnRonda(reviews, n, round));
  if (requeridos.length === 0 || pendientes.length > 0) {
    return { cerrada: false, pendientes };
  }
  const aprobado = requeridos.every(
    (n) => revisionEnRonda(reviews, n, round)?.overall_decision === "accepted",
  );
  return { cerrada: true, aprobado };
}

/** Historial ronda a ronda de un revisor, de la 1 a la actual. */
export function resumenRevisor(project: ProjectLike, reviews: ReviewLike[], name: string): ResumenRevisor {
  const actual = Math.max(1, project.current_round ?? 1);
  const rondas: RondaRevisor[] = [];
  let approvedRound: number | null = null;

  for (let round = 1; round <= actual; round++) {
    if (approvedRound !== null) {
      rondas.push({ round, estado: "carried" });
      continue;
    }
    const r = revisionEnRonda(reviews, name, round);
    if (r) {
      const estado: EstadoRonda = r.overall_decision === "accepted" ? "accepted" : "corrections";
      rondas.push({ round, estado });
      if (estado === "accepted") approvedRound = round;
    } else {
      rondas.push({ round, estado: round === actual ? "pending" : "skipped" });
    }
  }
  return { name, approvedRound, rondas };
}

/** Historial de todos los revisores asignados. */
export function resumenRondas(project: ProjectLike, reviews: ReviewLike[]): ResumenRevisor[] {
  return revisoresAsignados(project).map((n) => resumenRevisor(project, reviews, n));
}
