"use client";

import { Award, Check, X } from "lucide-react";

/**
 * Estado del proyecto como un recorrido de etapas, siempre en el mismo orden:
 *
 *   Enviado → En revisión · ronda N → Aprobado → Certificado
 *
 * La etapa actual se resalta con su color; las anteriores quedan marcadas
 * como hechas y las siguientes en gris. "Con observaciones" es parte de la
 * etapa de revisión (el proyecto vuelve a revisión en la ronda siguiente), y
 * "Rechazado" cierra el recorrido en la tercera etapa.
 *
 * Se usa en todas las pantallas donde el comité ve proyectos, para que el
 * estado se lea igual en cualquiera de ellas. Cuando el certificado ya está
 * emitido, la última etapa es un enlace para descargarlo.
 */

type Etapa = {
  label: string;
  /** "done" hecha · "current" actual · "todo" pendiente */
  estado: "done" | "current" | "todo";
  /** Clases de la etapa actual. */
  tono?: string;
  href?: string | null;
  icon?: "x" | "award";
};

const TONO = {
  enviado:     "bg-blue-50 text-blue-700 border-blue-200",
  revision:    "bg-amber-50 text-amber-700 border-amber-200",
  correcciones:"bg-orange-50 text-orange-700 border-orange-200",
  aprobado:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  certificado: "bg-violet-50 text-violet-700 border-violet-200",
  rechazado:   "bg-red-50 text-red-600 border-red-200",
};

function etapas(status: string, round: number, certificateUrl?: string | null): Etapa[] {
  const r = Math.max(1, round || 1);
  const revisionLabel = r > 1 ? `En revisión · ronda ${r}` : "En revisión";
  const pasos = ["submitted", "reviewing", "approved", "certified"];
  // Etapa en la que está el proyecto (0–3).
  const idx =
    status === "corrections" ? 1 :
    status === "rejected"    ? 2 :
    Math.max(0, pasos.indexOf(status));
  const st = (i: number): Etapa["estado"] => (i < idx ? "done" : i === idx ? "current" : "todo");

  const lista: Etapa[] = [
    { label: "Enviado", estado: st(0), tono: TONO.enviado },
    status === "corrections"
      ? { label: `Con observaciones · ronda ${r}`, estado: "current", tono: TONO.correcciones }
      : { label: idx > 1 && r > 1 ? `Revisado · ${r} rondas` : idx > 1 ? "Revisado" : revisionLabel, estado: st(1), tono: TONO.revision },
  ];
  if (status === "rejected") {
    lista.push({ label: "Rechazado", estado: "current", tono: TONO.rechazado, icon: "x" });
    return lista;
  }
  lista.push({ label: "Aprobado", estado: st(2), tono: TONO.aprobado });
  lista.push({
    label: "Certificado",
    estado: status === "certified" || certificateUrl ? "current" : "todo",
    tono: TONO.certificado,
    href: certificateUrl,
    icon: "award",
  });
  // Con certificado emitido, "Aprobado" pasa a hecho aunque el estado no se
  // haya actualizado a "certified".
  if (certificateUrl && lista[2].estado === "current") lista[2].estado = "done";
  return lista;
}

export default function ProjectState({
  status,
  certificateUrl,
  round,
}: {
  status: string;
  certificateUrl?: string | null;
  /** Ronda actual del proyecto (current_round). */
  round?: number | null;
}) {
  if (status === "draft") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
        Borrador
      </span>
    );
  }

  const lista = etapas(status, round ?? 1, certificateUrl);

  return (
    <ol className="inline-flex items-center flex-wrap gap-y-1" aria-label="Estado del proyecto">
      {lista.map((e, i) => {
        const cls =
          e.estado === "current" ? `${e.tono} font-bold` :
          e.estado === "done"    ? "bg-white text-slate-500 border-slate-200" :
                                   "bg-white text-slate-300 border-dashed border-slate-200";
        const contenido = (
          <>
            {e.estado === "done" && <Check className="w-3 h-3 text-emerald-600" />}
            {e.estado === "current" && e.icon === "x" && <X className="w-3 h-3" />}
            {e.estado === "current" && e.icon === "award" && <Award className="w-3 h-3" />}
            {e.estado === "current" && !e.icon && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
            {e.label}
          </>
        );
        const base = `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border whitespace-nowrap ${cls}`;
        return (
          <li key={e.label} className="inline-flex items-center" aria-current={e.estado === "current" ? "step" : undefined}>
            {i > 0 && (
              <span
                aria-hidden="true"
                className={`w-3 h-px mx-0.5 ${e.estado === "todo" ? "bg-slate-200" : "bg-slate-300"}`}
              />
            )}
            {e.href ? (
              <a
                href={e.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(ev) => ev.stopPropagation()}
                title="Descargar el certificado de ética"
                className={`${base} hover:brightness-95 underline-offset-2 hover:underline`}
              >
                {contenido}
              </a>
            ) : (
              <span className={base}>{contenido}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
