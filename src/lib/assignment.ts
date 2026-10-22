/**
 * Propuesta automática de revisores.
 *
 * Para cada proyecto enviado que espera revisores se proponen 2, con estas
 * reglas:
 *
 * Quién puede recibirlo
 *  - No es el investigador/a ni el profesor/a guía del proyecto.
 *  - No está marcado como no disponible.
 *  - Tiene menos de MAX_ACTIVOS proyectos activos.
 *
 * Cómo se elige, en orden
 *  1. Área: tiene la temática del proyecto entre sus áreas.
 *  2. Carga actual: menos proyectos activos.
 *  3. Reparto en el tiempo: menos proyectos recibidos en los últimos 6 meses.
 *  4. Quien lleva más tiempo sin recibir uno.
 *
 * Los proyectos en vía rápida se reparten primero; luego, del más antiguo al
 * más nuevo. Cada propuesta suma carga al revisor antes de pasar al siguiente
 * proyecto, para que un mismo lote no recaiga en las mismas personas.
 *
 * Lógica pura (sin Supabase): la usan el panel, la confirmación y el correo
 * diario, y se puede probar con datos de ejemplo.
 */

export const MAX_ACTIVOS = 5;
export const REVISORES_POR_PROYECTO = 2;
/** Estados en los que un proyecto cuenta como carga para sus revisores. */
export const ESTADOS_ACTIVOS = ["submitted", "reviewing", "corrections"];
const VENTANA_RECIENTE_MS = 182 * 86_400_000; // ~6 meses

export type RevisorBase = { name: string; email: string; expertise?: string[] | null };

export type ProyectoBase = {
  id: string;
  title?: string | null;
  status: string;
  theme?: string | null;
  reviewer?: string | null;
  reviewer2?: string | null;
  researcher_name?: string | null;
  researcher_email?: string | null;
  advisor_name?: string | null;
  created_at?: string | null;
  fast_track?: boolean | null;
  fast_track_deadline?: string | null;
};

export type Candidato = {
  name: string;
  email: string;
  /** Tiene el área del proyecto. */
  area: boolean;
  /** Proyectos activos hoy (sin contar las propuestas aún no confirmadas). */
  activos: number;
  /** Proyectos recibidos en los últimos 6 meses (hoy). */
  recientes: number;
};

export type Propuesta = {
  projectId: string;
  title: string;
  theme: string | null;
  fastTrack: boolean;
  fastTrackDeadline: string | null;
  createdAt: string | null;
  /** Revisores que el proyecto ya tiene (si le falta solo uno). */
  yaAsignados: string[];
  /** Revisores propuestos para completar los cupos. */
  propuestos: Candidato[];
  /** Avisos para la coordinación (fuera de área, sin cupo suficiente). */
  avisos: string[];
};

// ── Utilidades ───────────────────────────────────────────────────────────────

/** Compara nombres sin mayúsculas, tildes ni espacios extra. */
export function normalizar(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/\s+/g, " ").trim();
}

export function mismaPersona(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = normalizar(a);
  return !!x && x === normalizar(b);
}

/**
 * Proyectos que esperan revisores: enviados con menos de 2, o en revisión sin
 * ninguno. Un proyecto en revisión con un solo revisor se deja como está: la
 * coordinación pudo asignarlo así a propósito.
 */
export function esperaRevisores(p: ProyectoBase): boolean {
  const n = asignadosDe(p).length;
  if (p.status === "submitted") return n < REVISORES_POR_PROYECTO;
  if (p.status === "reviewing") return n === 0;
  return false;
}

export function asignadosDe(p: ProyectoBase): string[] {
  const out: string[] = [];
  for (const n of [p.reviewer, p.reviewer2]) {
    if (n && n.trim() && !out.some((o) => mismaPersona(o, n))) out.push(n);
  }
  return out;
}

/** El revisor es el investigador/a o el profesor/a guía del proyecto. */
export function tieneConflicto(r: RevisorBase, p: ProyectoBase): boolean {
  if (r.email && p.researcher_email && r.email.trim().toLowerCase() === p.researcher_email.trim().toLowerCase()) return true;
  return mismaPersona(r.name, p.researcher_name) || mismaPersona(r.name, p.advisor_name);
}

// ── Carga de cada revisor ────────────────────────────────────────────────────

type Carga = { activos: number; recientes: number; ultimo: number };

export function cargaInicial(revisores: RevisorBase[], proyectos: ProyectoBase[], ahora = Date.now()): Map<string, Carga> {
  const carga = new Map<string, Carga>();
  for (const r of revisores) carga.set(normalizar(r.name), { activos: 0, recientes: 0, ultimo: 0 });
  for (const p of proyectos) {
    const t = Date.parse(p.created_at ?? "") || 0;
    for (const n of asignadosDe(p)) {
      const c = carga.get(normalizar(n));
      if (!c) continue;
      if (ESTADOS_ACTIVOS.includes(p.status)) c.activos++;
      if (t && ahora - t <= VENTANA_RECIENTE_MS) c.recientes++;
      if (t > c.ultimo) c.ultimo = t;
    }
  }
  return carga;
}

// ── Propuestas ───────────────────────────────────────────────────────────────

function ordenProyectos(a: ProyectoBase, b: ProyectoBase): number {
  const va = a.fast_track ? 0 : 1;
  const vb = b.fast_track ? 0 : 1;
  if (va !== vb) return va - vb;
  if (a.fast_track && b.fast_track) {
    const da = a.fast_track_deadline ?? "9999";
    const db = b.fast_track_deadline ?? "9999";
    if (da !== db) return da < db ? -1 : 1;
  }
  return (Date.parse(a.created_at ?? "") || 0) - (Date.parse(b.created_at ?? "") || 0);
}

/**
 * Candidatos para un proyecto, ya ordenados. No modifica la carga.
 * `excluir`: nombres que no pueden repetirse (los ya asignados).
 */
export function candidatosPara(
  p: ProyectoBase,
  revisores: RevisorBase[],
  carga: Map<string, Carga>,
  noDisponibles: Set<string>,
  excluir: string[] = [],
): (Candidato & { ultimo: number })[] {
  const tema = p.theme ?? "";
  return revisores
    .filter((r) => r.name && r.email)
    .filter((r) => !excluir.some((n) => mismaPersona(n, r.name)))
    .filter((r) => !noDisponibles.has(r.email.trim().toLowerCase()))
    .filter((r) => !tieneConflicto(r, p))
    .map((r) => {
      const c = carga.get(normalizar(r.name)) ?? { activos: 0, recientes: 0, ultimo: 0 };
      return {
        name: r.name,
        email: r.email,
        area: !!tema && (r.expertise ?? []).includes(tema),
        activos: c.activos,
        recientes: c.recientes,
        ultimo: c.ultimo,
      };
    })
    .filter((c) => c.activos < MAX_ACTIVOS)
    .sort((a, b) =>
      Number(b.area) - Number(a.area) ||
      a.activos - b.activos ||
      a.recientes - b.recientes ||
      a.ultimo - b.ultimo ||
      a.name.localeCompare(b.name, "es"),
    );
}

export function proponerAsignaciones(opts: {
  proyectos: ProyectoBase[];
  revisores: RevisorBase[];
  noDisponibles?: string[];
  ahora?: number;
}): Propuesta[] {
  const { proyectos, revisores } = opts;
  const noDisp = new Set((opts.noDisponibles ?? []).map((e) => e.trim().toLowerCase()));
  const carga = cargaInicial(revisores, proyectos, opts.ahora);
  // Carga real, para mostrarla; `carga` además suma lo propuesto en el lote.
  const real = cargaInicial(revisores, proyectos, opts.ahora);

  const pendientes = proyectos.filter(esperaRevisores).sort(ordenProyectos);
  const out: Propuesta[] = [];

  for (const p of pendientes) {
    const ya = asignadosDe(p);
    const faltan = REVISORES_POR_PROYECTO - ya.length;
    const lista = candidatosPara(p, revisores, carga, noDisp, ya).slice(0, faltan);

    const avisos: string[] = [];
    if (lista.length < faltan) {
      avisos.push(
        lista.length === 0
          ? "No hay revisores disponibles con cupo: asigna a mano o libera cupos."
          : `Solo hay ${lista.length} revisor/a disponible con cupo; falta ${faltan - lista.length}.`,
      );
    }
    const fuera = lista.filter((c) => !c.area);
    if (p.theme && fuera.length) {
      avisos.push(
        `${fuera.map((c) => c.name).join(" y ")} no ${fuera.length > 1 ? "tienen" : "tiene"} esta área: no hay suficientes revisores del área con cupo.`,
      );
    }

    // La propuesta cuenta como carga para el siguiente proyecto del lote.
    const ahora = opts.ahora ?? Date.now();
    for (const c of lista) {
      const k = carga.get(normalizar(c.name));
      if (k) { k.activos++; k.recientes++; k.ultimo = ahora; }
    }

    out.push({
      projectId: p.id,
      title: p.title ?? "",
      theme: p.theme ?? null,
      fastTrack: !!p.fast_track,
      fastTrackDeadline: p.fast_track_deadline ?? null,
      createdAt: p.created_at ?? null,
      yaAsignados: ya,
      propuestos: lista.map((c) => {
        const r = real.get(normalizar(c.name));
        return { name: c.name, email: c.email, area: c.area, activos: r?.activos ?? 0, recientes: r?.recientes ?? 0 };
      }),
      avisos,
    });
  }
  return out;
}

/**
 * Verifica una asignación elegida (propuesta o cambiada a mano) justo antes
 * de guardarla. Devuelve los problemas que impiden confirmarla.
 */
export function validarAsignacion(
  p: ProyectoBase,
  elegidos: string[],
  revisores: RevisorBase[],
): string[] {
  const errores: string[] = [];
  const nombres = elegidos.filter((n) => n && n.trim());
  if (nombres.length === 0) errores.push("Elige al menos un revisor/a.");
  if (nombres.length === 2 && mismaPersona(nombres[0], nombres[1])) errores.push("Los dos revisores son la misma persona.");
  for (const n of nombres) {
    const r = revisores.find((x) => mismaPersona(x.name, n));
    if (!r) { errores.push(`${n} no está registrado/a como revisor/a.`); continue; }
    if (tieneConflicto(r, p)) errores.push(`${r.name} es investigador/a o guía del proyecto.`);
  }
  return errores;
}
