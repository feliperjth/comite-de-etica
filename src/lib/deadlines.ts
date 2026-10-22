/**
 * Plazos de revisión y recordatorios.
 *
 * Cada ronda tiene 3 semanas de plazo desde que empieza (envío del proyecto
 * en la 1; reenvío de correcciones en las siguientes, ver iniciosDeRonda). Los
 * proyectos en vía rápida usan como plazo su fecha límite de postulación.
 *
 * Lógica pura: la usan el panel, la página de seguimiento y el envío
 * automático de recordatorios (/api/cron/reminders).
 */

import { iniciosDeRonda, type DocConFecha, type ReviewConFecha } from "@/lib/rounds";

export const PLAZO_DIAS = 21;
const DIA = 86_400_000;

export type ProyectoPlazo = {
  created_at?: string | null;
  current_round?: number | null;
  status?: string | null;
  fast_track?: boolean | null;
  fast_track_deadline?: string | null;
};

export type Plazo = {
  /** Inicio de la ronda actual (ISO). */
  inicio: string;
  /** Fecha límite de la ronda (YYYY-MM-DD). */
  limite: string;
  /** Días desde el inicio de la ronda. */
  diasTranscurridos: number;
  /** Días hasta el límite; negativo si ya venció. */
  diasRestantes: number;
  vencido: boolean;
  viaRapida: boolean;
};

/**
 * El día calendario de `t` en Chile, como medianoche UTC, para contar días
 * enteros sin que el cambio de fecha UTC (21:00 en Chile) adelante un día.
 */
function dia(t: number): number {
  return Date.parse(`${new Date(t).toLocaleDateString("en-CA", { timeZone: "America/Santiago" })}T00:00:00Z`);
}

function isoFecha(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

/** Estados en los que corre el plazo de los revisores. */
export function enPlazoDeRevision(status: string | null | undefined): boolean {
  return status === "submitted" || status === "reviewing";
}

export function calcularPlazo(
  project: ProyectoPlazo,
  docs: DocConFecha[],
  reviews: ReviewConFecha[],
  ahora = Date.now(),
): Plazo {
  const ronda = Math.max(1, project.current_round ?? 1);
  const inicios = iniciosDeRonda({ createdAt: project.created_at, currentRound: ronda, docs, reviews });
  const inicio = inicios[ronda - 1] || ahora;

  const viaRapida = !!project.fast_track && !!project.fast_track_deadline;
  const limiteMs = viaRapida
    ? Date.parse(`${project.fast_track_deadline!.slice(0, 10)}T00:00:00Z`)
    : dia(inicio) + PLAZO_DIAS * DIA;

  const diasRestantes = Math.round((limiteMs - dia(ahora)) / DIA);
  return {
    inicio: new Date(inicio).toISOString(),
    limite: isoFecha(limiteMs),
    diasTranscurridos: Math.max(0, Math.round((dia(ahora) - dia(inicio)) / DIA)),
    diasRestantes,
    vencido: diasRestantes < 0,
    viaRapida,
  };
}

export function fechaCorta(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

export function fechaLarga(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
}

/** "Plazo: 12 nov · quedan 9 días" / "Plazo vencido hace 3 días". */
export function etiquetaPlazo(p: Plazo): string {
  if (p.vencido) {
    const n = -p.diasRestantes;
    return `Plazo vencido hace ${n} día${n !== 1 ? "s" : ""}`;
  }
  if (p.diasRestantes === 0) return `Plazo: hoy (${fechaCorta(p.limite)})`;
  return `Plazo: ${fechaCorta(p.limite)} · quedan ${p.diasRestantes} día${p.diasRestantes !== 1 ? "s" : ""}`;
}

// ── Recordatorios ───────────────────────────────────────────────────────────

/** Días sin actividad del revisor que hacen falta para enviarle recordatorio. */
export function diasSinActividadParaAviso(viaRapida: boolean): number {
  return viaRapida ? 3 : 7;
}

/** Días mínimos de ronda antes del primer recordatorio. */
export function diasMinimosParaAviso(viaRapida: boolean): number {
  return viaRapida ? 1 : 4;
}

/**
 * ¿Hoy toca recordatorio para este tipo de proyecto? Los normales el viernes;
 * los de vía rápida, lunes y jueves. `diaSemana`: 0 domingo … 6 sábado, en la
 * hora de Chile.
 */
export function tocaHoy(viaRapida: boolean, diaSemana: number): boolean {
  return viaRapida ? diaSemana === 1 || diaSemana === 4 : diaSemana === 5;
}

/** Día de la semana en Chile (0 domingo … 6 sábado). */
export function diaSemanaChile(ahora = new Date()): number {
  const nombre = ahora.toLocaleDateString("en-US", { weekday: "short", timeZone: "America/Santiago" });
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(nombre);
}

/** Fecha de hoy en Chile (YYYY-MM-DD), para no enviar dos veces el mismo día. */
export function hoyChile(ahora = new Date()): string {
  return ahora.toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
}
