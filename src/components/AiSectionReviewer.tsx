"use client";

import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Loader2, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { sections } from "@/lib/sections";

interface Props {
  projectTitle: string;
}

type SectionState = {
  text: string;
  result: string | null;
  loading: boolean;
  error: string;
  open: boolean;
  resultOpen: boolean;
};

function initState(): Record<string, SectionState> {
  return Object.fromEntries(
    sections.map((s) => [s.key, { text: "", result: null, loading: false, error: "", open: false, resultOpen: false }])
  );
}

function StatusChip({ label }: { label: string }) {
  const upper = label.toUpperCase();
  if (upper === "CUMPLE")
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" />CUMPLE</span>;
  if (upper === "MEJORAR")
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full"><AlertCircle className="w-3 h-3" />MEJORAR</span>;
  if (upper === "FALTA")
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" />FALTA</span>;
  return <span className="text-[10px] font-bold text-slate-500">{label}</span>;
}

function renderResult(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("## ")) {
      return <h4 key={i} className="font-bold text-slate-800 text-sm mt-4 mb-1 first:mt-0">{line.slice(3)}</h4>;
    }
    // **Estado:** [CUMPLE / MEJORAR / FALTA]
    const estadoMatch = line.match(/^\*\*Estado:\*\*\s*(.+)/);
    if (estadoMatch) {
      return <div key={i} className="mb-1"><StatusChip label={estadoMatch[1].trim()} /></div>;
    }
    const boldReplaced = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    if (boldReplaced !== line) {
      return <p key={i} className="text-slate-600 text-xs leading-relaxed mb-0.5" dangerouslySetInnerHTML={{ __html: boldReplaced }} />;
    }
    if (line.trim() === "") return <div key={i} className="h-1" />;
    return <p key={i} className="text-slate-600 text-xs leading-relaxed">{line}</p>;
  });
}

export default function AiSectionReviewer({ projectTitle }: Props) {
  const [state, setState] = useState<Record<string, SectionState>>(initState);

  function update(key: string, patch: Partial<SectionState>) {
    setState((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  async function analyze(sectionKey: string) {
    const section = sections.find((s) => s.key === sectionKey)!;
    const { text } = state[sectionKey];
    if (!text.trim()) { update(sectionKey, { error: "Pega el texto de esta sección para analizarlo." }); return; }
    update(sectionKey, { loading: true, error: "", result: null });
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        title: projectTitle,
        mode: "seccion",
        sectionLabel: section.label,
        criteria: section.criteria,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      update(sectionKey, { result: data.review, loading: false, resultOpen: true });
    } else {
      update(sectionKey, { error: data.error ?? "Error al analizar.", loading: false });
    }
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
          <Sparkles className="w-4.5 h-4.5 text-violet-600" />
        </div>
        <div>
          <p className="font-semibold text-violet-900 text-sm">Revisión por sección con IA</p>
          <p className="text-violet-500 text-xs">Pega el texto de cada apartado y la IA lo evalúa contra los criterios del comité</p>
        </div>
      </div>

      <div className="space-y-3">
        {sections.map((section) => {
          const s = state[section.key];
          return (
            <div key={section.key} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Header */}
              <button
                onClick={() => update(section.key, { open: !s.open })}
                className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-slate-400 shrink-0 w-8">{section.roman}</span>
                  <span className="text-sm font-semibold text-slate-800 truncate">{section.label}</span>
                  {s.result && (
                    <span className="shrink-0 w-2 h-2 rounded-full bg-violet-400" title="Analizado" />
                  )}
                </div>
                {s.open
                  ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                }
              </button>

              {s.open && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-3">
                  {/* Descripción */}
                  <p className="text-xs text-slate-500 leading-relaxed">{section.description}</p>

                  {/* Criterios */}
                  <div className="bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-1.5">Criterios que evaluará la IA</p>
                    <ul className="space-y-1">
                      {section.criteria.map((c, ci) => (
                        <li key={ci} className="flex items-start gap-1.5 text-xs text-slate-600">
                          <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>{c}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Textarea */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                      Tu texto para esta sección
                    </label>
                    <textarea
                      value={s.text}
                      onChange={(e) => update(section.key, { text: e.target.value, error: "" })}
                      placeholder={`Pega aquí lo que escribiste en el formulario para "${section.label}"…`}
                      rows={5}
                      className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-y placeholder:text-slate-300"
                    />
                  </div>

                  {s.error && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{s.error}</p>
                  )}

                  {/* Botón */}
                  <button
                    onClick={() => analyze(section.key)}
                    disabled={s.loading}
                    className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
                  >
                    {s.loading
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analizando...</>
                      : <><Sparkles className="w-3.5 h-3.5" />{s.result ? "Volver a analizar" : "Analizar esta sección"}</>
                    }
                  </button>

                  {/* Resultado */}
                  {s.result && (
                    <div className="border border-violet-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => update(section.key, { resultOpen: !s.resultOpen })}
                        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-violet-50 hover:bg-violet-100 transition-colors"
                      >
                        <span className="text-xs font-bold text-violet-700">Resultado del análisis</span>
                        {s.resultOpen
                          ? <ChevronUp className="w-3.5 h-3.5 text-violet-500" />
                          : <ChevronDown className="w-3.5 h-3.5 text-violet-500" />
                        }
                      </button>
                      {s.resultOpen && (
                        <div className="px-4 py-4 bg-white">
                          {renderResult(s.result)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
