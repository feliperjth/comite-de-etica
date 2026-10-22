"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users, RefreshCw, CheckCircle, AlertTriangle, Zap, Pencil, Send, ChevronDown, ChevronUp,
  CalendarClock, X,
} from "lucide-react";
import { themes, getThemeLabel } from "@/lib/themes";
import type { Project, Reviewer } from "@/lib/supabase";
import { ESTADOS_ACTIVOS, mismaPersona, type Candidato, type Propuesta } from "@/lib/assignment";
import { fechaLimiteLegible } from "@/lib/fastTrack";

/**
 * Asignación de revisores (solo coordinación).
 *
 * Muestra la propuesta automática para cada proyecto que espera revisores,
 * con el motivo de cada elección, y permite confirmarla, cambiarla o
 * confirmar todas. Debajo, la lista de revisores con su carga y un
 * interruptor de disponibilidad. Las reglas están en src/lib/assignment.ts.
 */

type Resultado = { ok: boolean; texto: string };

function diasDesde(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.max(0, Math.floor((Date.now() - t) / 86_400_000)) : null;
}

export default function AssignmentPanel({
  projects,
  reviewers,
  onChanged,
}: {
  projects: Project[];
  reviewers: Reviewer[];
  onChanged: () => void;
}) {
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [noDisponibles, setNoDisponibles] = useState<string[]>([]);
  const [maxActivos, setMaxActivos] = useState(5);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  /** Revisores elegidos por proyecto (propuesta o cambio manual). */
  const [elegidos, setElegidos] = useState<Record<string, string[]>>({});
  const [editando, setEditando] = useState<Record<string, boolean>>({});
  const [enviando, setEnviando] = useState<Record<string, boolean>>({});
  const [resultados, setResultados] = useState<Record<string, Resultado>>({});
  const [confirmandoTodas, setConfirmandoTodas] = useState(false);
  const [modo, setModo] = useState<"auto" | "manual">("manual");
  const [guardandoModo, setGuardandoModo] = useState(false);
  const [verRevisores, setVerRevisores] = useState(false);
  const [cambiandoDisp, setCambiandoDisp] = useState<string | null>(null);

  /** Trae propuestas y configuración. Solo cambia el estado tras la respuesta. */
  const obtener = useCallback(async () => {
    try {
      const [r, s]: [{ propuestas?: Propuesta[]; noDisponibles?: string[]; maxActivos?: number }, Record<string, string>] = await Promise.all([
        fetch("/api/admin/assignments").then(async (x) => (x.ok ? x.json() : Promise.reject(new Error((await x.json()).error)))),
        fetch("/api/admin/settings").then((x) => (x.ok ? x.json() : {})),
      ]);
      setError("");
      setPropuestas(r.propuestas ?? []);
      setNoDisponibles(r.noDisponibles ?? []);
      setMaxActivos(r.maxActivos ?? 5);
      setElegidos(Object.fromEntries((r.propuestas ?? []).map((p) => [p.projectId, p.propuestos.map((c) => c.name)])));
      setEditando({});
      if (s?.reviewer_assignment_mode === "auto" || s?.reviewer_assignment_mode === "manual") setModo(s.reviewer_assignment_mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las propuestas.");
    } finally {
      setCargando(false);
    }
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    await obtener();
  }, [obtener]);

  // Primera carga: diferida a una microtarea para no cambiar el estado
  // dentro del propio efecto.
  useEffect(() => { void Promise.resolve().then(obtener); }, [obtener]);

  // Carga actual de cada revisor, para los selectores y la lista.
  const activos = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of reviewers) {
      m.set(r.name, projects.filter((p) =>
        ESTADOS_ACTIVOS.includes(p.status) && (mismaPersona(p.reviewer, r.name) || mismaPersona(p.reviewer2, r.name)),
      ).length);
    }
    return m;
  }, [projects, reviewers]);

  const noDisp = useMemo(() => new Set(noDisponibles.map((e) => e.toLowerCase())), [noDisponibles]);

  async function confirmar(items: { projectId: string; reviewers: string[] }[]) {
    const res = await fetch("/api/admin/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const r: Record<string, Resultado> = {};
      for (const it of items) r[it.projectId] = { ok: false, texto: data.error ?? "No se pudo confirmar." };
      setResultados((prev) => ({ ...prev, ...r }));
      return;
    }
    const r: Record<string, Resultado> = {};
    for (const x of data.resultados ?? []) {
      r[x.projectId] = x.ok
        ? { ok: true, texto: `Asignado a ${x.asignados.join(" y ")}${x.avisados?.length ? " · aviso enviado" : ""}` }
        : { ok: false, texto: x.error };
    }
    setResultados((prev) => ({ ...prev, ...r }));
    onChanged();
    await cargar();
  }

  async function confirmarUna(p: Propuesta) {
    setEnviando((prev) => ({ ...prev, [p.projectId]: true }));
    await confirmar([{ projectId: p.projectId, reviewers: elegidos[p.projectId] ?? [] }]);
    setEnviando((prev) => ({ ...prev, [p.projectId]: false }));
  }

  const listasParaTodas = propuestas.filter((p) => {
    const e = (elegidos[p.projectId] ?? []).filter(Boolean);
    return e.length > 0 && e.length + p.yaAsignados.length >= 2;
  });

  async function confirmarTodas() {
    setConfirmandoTodas(true);
    await confirmar(listasParaTodas.map((p) => ({ projectId: p.projectId, reviewers: elegidos[p.projectId] ?? [] })));
    setConfirmandoTodas(false);
  }

  async function cambiarModo() {
    const next = modo === "auto" ? "manual" : "auto";
    setGuardandoModo(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "reviewer_assignment_mode", value: next }),
    });
    if (res.ok) setModo(next);
    setGuardandoModo(false);
  }

  async function cambiarDisponibilidad(r: Reviewer, disponible: boolean) {
    setCambiandoDisp(r.email);
    const res = await fetch("/api/admin/assignments/availability", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: r.email, available: disponible }),
    });
    if (res.ok) await cargar();
    setCambiandoDisp(null);
  }

  function etiquetaRevisor(r: Reviewer, theme: string | null): string {
    const area = theme && (r.expertise ?? []).includes(theme) ? "área ✓" : "otra área";
    const n = activos.get(r.name) ?? 0;
    const extra = noDisp.has(r.email.toLowerCase()) ? " · no disponible" : n >= maxActivos ? " · sin cupo" : "";
    return `${r.name} (${area}, ${n}/${maxActivos})${extra}`;
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-6">
      {/* Encabezado */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#CC5200]" />
          <span className="font-semibold text-slate-700">Asignación de revisores</span>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ml-1 ${propuestas.length ? "bg-orange-50 text-[#CC5200]" : "bg-slate-50 text-slate-400"}`}>
            {cargando ? "…" : propuestas.length === 0 ? "Nada pendiente" : `${propuestas.length} esperando revisores`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cambiarModo}
            disabled={guardandoModo}
            title="Cada día hábil a las 9:00 se envía a la coordinación un correo con las propuestas pendientes."
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              modo === "auto"
                ? "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600"
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <CalendarClock className="w-3.5 h-3.5" />
            {guardandoModo ? "Guardando..." : modo === "auto" ? "Propuesta diaria por correo ✓" : "Propuesta diaria desactivada"}
          </button>
          <button
            onClick={cargar}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? "animate-spin" : ""}`} /> Recalcular
          </button>
        </div>
      </div>

      <p className="px-6 pt-4 text-xs text-slate-500 leading-relaxed">
        Se proponen 2 revisores por proyecto: primero quienes tienen el <strong>área</strong> del proyecto, luego quien tiene{" "}
        <strong>menos proyectos activos</strong> (máximo {maxActivos}) y, si empatan, quien ha recibido <strong>menos en los últimos 6 meses</strong>.
        Se excluye al investigador/a, al guía y a quien esté marcado como no disponible. La vía rápida va primero.
      </p>

      {/* Propuestas */}
      <div className="px-6 py-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
        )}
        {!error && !cargando && propuestas.length === 0 && (
          <p className="text-sm text-slate-400 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" /> Todos los proyectos enviados tienen revisores.
          </p>
        )}

        <div className="space-y-3">
          {propuestas.map((p) => {
            const elegidosP = elegidos[p.projectId] ?? [];
            const espera = diasDesde(p.createdAt);
            const res = resultados[p.projectId];
            const huecos = 2 - p.yaAsignados.length;
            return (
              <div key={p.projectId} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 text-sm leading-snug">{p.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>{p.theme ? getThemeLabel(p.theme) : "Sin temática"}</span>
                      {espera !== null && <span>· enviado hace {espera} día{espera !== 1 ? "s" : ""}</span>}
                      {p.fastTrack && (
                        <span className="inline-flex items-center gap-1 font-bold text-[#CC5200]">
                          <Zap className="w-3 h-3" /> Vía rápida{p.fastTrackDeadline ? ` · ${fechaLimiteLegible(p.fastTrackDeadline)}` : ""}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setEditando((prev) => ({ ...prev, [p.projectId]: !prev[p.projectId] }))}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 border border-slate-200 bg-white px-3 py-1.5 rounded-lg hover:bg-slate-50"
                    >
                      {editando[p.projectId] ? <><X className="w-3.5 h-3.5" /> Cerrar</> : <><Pencil className="w-3.5 h-3.5" /> Cambiar</>}
                    </button>
                    <button
                      onClick={() => confirmarUna(p)}
                      disabled={enviando[p.projectId] || elegidosP.filter(Boolean).length === 0}
                      className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#CC5200] hover:bg-[#B34700] disabled:opacity-40 px-3.5 py-1.5 rounded-lg"
                    >
                      {enviando[p.projectId] ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Confirmar y avisar
                    </button>
                  </div>
                </div>

                {/* Revisores */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.yaAsignados.map((n) => (
                    <span key={n} className="inline-flex items-center gap-1.5 text-xs bg-white border border-slate-200 text-slate-500 px-2.5 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3 text-emerald-500" /> {n} · ya asignado/a
                    </span>
                  ))}
                  {!editando[p.projectId] && p.propuestos.map((c: Candidato) => (
                    <span
                      key={c.name}
                      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                        c.area ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-amber-50 border-amber-200 text-amber-800"
                      }`}
                    >
                      <Users className="w-3 h-3" />
                      <strong>{c.name}</strong>
                      <span className="opacity-75">
                        · {c.area ? "área ✓" : "otra área"} · {c.activos}/{maxActivos} activos · {c.recientes} en 6 meses
                      </span>
                    </span>
                  ))}
                </div>

                {editando[p.projectId] && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Array.from({ length: huecos }).map((_, i) => (
                      <select
                        key={i}
                        value={elegidosP[i] ?? ""}
                        onChange={(e) => {
                          const next = [...elegidosP];
                          next[i] = e.target.value;
                          setElegidos((prev) => ({ ...prev, [p.projectId]: next }));
                        }}
                        className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 max-w-full"
                      >
                        <option value="">— Revisor/a {p.yaAsignados.length + i + 1} —</option>
                        {reviewers
                          .filter((r) => !p.yaAsignados.some((n) => mismaPersona(n, r.name)))
                          .map((r) => (
                            <option key={r.email} value={r.name}>{etiquetaRevisor(r, p.theme)}</option>
                          ))}
                      </select>
                    ))}
                  </div>
                )}

                {p.avisos.map((a) => (
                  <p key={a} className="mt-2 text-xs text-amber-700 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {a}
                  </p>
                ))}
                {res && (
                  <p className={`mt-2 text-xs font-medium ${res.ok ? "text-emerald-600" : "text-red-500"}`}>{res.texto}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Resultados de proyectos ya confirmados (salen de la lista) */}
        {Object.entries(resultados)
          .filter(([id, r]) => r.ok && !propuestas.some((p) => p.projectId === id))
          .map(([id, r]) => (
            <p key={id} className="mt-2 text-xs font-medium text-emerald-600 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" /> {projects.find((x) => x.id === id)?.title ?? "Proyecto"}: {r.texto}
            </p>
          ))}

        {listasParaTodas.length > 1 && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={confirmarTodas}
              disabled={confirmandoTodas}
              className="flex items-center gap-1.5 text-sm font-bold text-white bg-uai-navy hover:bg-black disabled:opacity-50 px-4 py-2 rounded-xl"
            >
              {confirmandoTodas ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Confirmar todas ({listasParaTodas.length}) y avisar
            </button>
          </div>
        )}
      </div>

      {/* Revisores: carga y disponibilidad */}
      <div className="border-t border-slate-100">
        <button
          onClick={() => setVerRevisores((v) => !v)}
          className="w-full px-6 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Users className="w-4 h-4 text-slate-400" /> Revisores: carga y disponibilidad
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{reviewers.length}</span>
            {noDisponibles.length > 0 && (
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{noDisponibles.length} no disponible{noDisponibles.length !== 1 ? "s" : ""}</span>
            )}
          </span>
          {verRevisores ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {verRevisores && (
          <div className="divide-y divide-slate-50 border-t border-slate-100">
            {reviewers.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">No hay revisores registrados aún.</p>
            )}
            {reviewers.map((r) => {
              const n = activos.get(r.name) ?? 0;
              const disponible = !noDisp.has(r.email.toLowerCase());
              const color = n >= maxActivos ? "text-red-500" : n >= maxActivos - 1 ? "text-amber-500" : "text-emerald-600";
              return (
                <div key={r.email} className={`px-6 py-3.5 flex items-center gap-4 flex-wrap ${disponible ? "" : "bg-slate-50/70"}`}>
                  <div className="flex-1 min-w-[200px]">
                    <div className={`font-semibold text-sm ${disponible ? "text-slate-800" : "text-slate-400"}`}>{r.name}</div>
                    <div className="text-xs text-slate-400">{r.email}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {(r.expertise ?? []).map((id) => {
                        const t = themes.find((th) => th.id === id);
                        return t ? (
                          <span key={id} className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 text-[11px] font-medium px-2 py-0.5 rounded-full border border-orange-100">
                            {t.emoji} {t.short}
                          </span>
                        ) : null;
                      })}
                      {(!r.expertise || r.expertise.length === 0) && (
                        <span className="text-xs text-slate-300 italic">Sin áreas definidas</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right w-24">
                    <div className={`text-lg font-bold ${color}`}>{n}<span className="text-slate-300 text-sm font-semibold">/{maxActivos}</span></div>
                    <div className="text-[11px] text-slate-400">activos</div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className={`text-xs font-semibold ${disponible ? "text-emerald-600" : "text-slate-400"}`}>
                      {disponible ? "Disponible" : "No disponible"}
                    </span>
                    <button
                      role="switch"
                      aria-checked={disponible}
                      onClick={() => cambiarDisponibilidad(r, !disponible)}
                      disabled={cambiandoDisp === r.email}
                      className={`relative w-10 h-6 rounded-full transition-colors disabled:opacity-50 ${disponible ? "bg-emerald-500" : "bg-slate-300"}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${disponible ? "left-[18px]" : "left-0.5"}`} />
                    </button>
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
