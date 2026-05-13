"use client";
// v2
import { useState } from "react";
import { sections } from "@/lib/sections";
import { CheckCircle, ChevronDown, ChevronUp, AlertCircle, BookOpen } from "lucide-react";
import Link from "next/link";

export default function PautaPreview() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggle(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <Link href="/revisores/dashboard" className="text-sm text-slate-400 hover:text-slate-600 mb-4 inline-block">
          ← Volver al panel
        </Link>
        <h1 className="text-3xl font-bold text-uai-navy mb-2">Pauta de evaluación</h1>
        <p className="text-slate-500 text-sm">
          Esta es la planilla que usan los revisores para evaluar cada proyecto enviado al Comité de Ética.
          Cada sección corresponde a una parte del protocolo UAI.
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((section, idx) => {
          const isOpen = expanded[section.key] ?? false;
          return (
            <div key={section.key} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Header */}
              <button
                onClick={() => toggle(section.key)}
                className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-uai-navy text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-slate-800 text-sm">{section.label}</span>
                </div>
                {isOpen
                  ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                }
              </button>

              {isOpen && (
                <div className="px-6 pb-6 space-y-4 border-t border-slate-100">
                  {/* Descripción */}
                  <div className="pt-4">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                      <BookOpen className="w-3 h-3" /> Qué debe contener
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed">{section.description}</p>
                  </div>

                  {/* Criterios de aceptación */}
                  {section.criteria.length > 0 && (
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                      <p className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-2">
                        <CheckCircle className="w-3 h-3" /> Criterios de aceptación
                      </p>
                      <ul className="space-y-1.5">
                        {section.criteria.map((c, ci) => (
                          <li key={ci} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Frases preset de corrección */}
                  {section.standardCorrections.length > 0 && (
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                      <p className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-2">
                        <AlertCircle className="w-3 h-3" /> Observaciones frecuentes (frases preset)
                      </p>
                      <ul className="space-y-1.5">
                        {section.standardCorrections.map((c, ci) => (
                          <li key={ci} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="text-amber-400 shrink-0 mt-0.5">·</span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-400 mt-10">
        {sections.length} secciones · Protocolo de Evaluación Ética UAI
      </p>
    </div>
  );
}
