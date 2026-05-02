"use client";

import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface Props {
  title: string;
  abstract: string | null;
  mode: "investigador" | "revisor";
}

const CONFIG = {
  investigador: {
    heading: "Consulta a la IA — Fortaleza ética de tu propuesta",
    subheading: "Identifica qué reforzar antes de la revisión del comité",
    buttonLabel: "Consultar IA",
    rebuttonLabel: "Volver a consultar",
    accent: "violet",
    pill: "Asistente para investigadores",
  },
  revisor: {
    heading: "Análisis ético con IA (Gemini)",
    subheading: "Evaluación preliminar de los tres pilares éticos",
    buttonLabel: "Analizar con IA",
    rebuttonLabel: "Volver a analizar",
    accent: "violet",
    pill: "Apoyo al revisor del comité",
  },
} as const;

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("## ")) {
      return (
        <h3 key={i} className="font-bold text-slate-800 text-sm mt-5 mb-1.5 first:mt-0">
          {line.slice(3)}
        </h3>
      );
    }
    const boldReplaced = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    if (boldReplaced !== line) {
      return (
        <p
          key={i}
          className="text-slate-600 text-xs leading-relaxed mb-0.5"
          dangerouslySetInnerHTML={{ __html: boldReplaced }}
        />
      );
    }
    if (line.trim() === "") return <div key={i} className="h-1.5" />;
    return (
      <p key={i} className="text-slate-600 text-xs leading-relaxed">
        {line}
      </p>
    );
  });
}

export default function AiAnalysisPanel({ title, abstract, mode }: Props) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [open, setOpen]         = useState(false);

  const cfg = CONFIG[mode];

  async function handleAnalyze() {
    const text = abstract ?? title;
    setLoading(true);
    setError("");
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, title, mode }),
    });
    const data = await res.json();
    if (res.ok) {
      setAnalysis(data.review);
      setOpen(true);
    } else {
      setError(data.error ?? "Error al analizar con IA.");
    }
    setLoading(false);
  }

  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-200 shadow-sm overflow-hidden mb-8">
      <div className="px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
            <Sparkles className="w-4.5 h-4.5 text-violet-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-violet-900 text-sm">{cfg.heading}</p>
              <span className="text-[10px] font-bold bg-violet-200 text-violet-700 px-2 py-0.5 rounded-full uppercase tracking-wide">
                {cfg.pill}
              </span>
            </div>
            <p className="text-violet-500 text-xs mt-0.5">{cfg.subheading}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {analysis && (
            <button
              onClick={() => setOpen((o) => !o)}
              className="text-violet-400 hover:text-violet-600 transition-colors"
            >
              {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm whitespace-nowrap"
          >
            {loading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analizando...</>
              : <><Sparkles className="w-3.5 h-3.5" /> {analysis ? cfg.rebuttonLabel : cfg.buttonLabel}</>
            }
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-5 mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {analysis && open && (
        <div className="border-t border-violet-200 bg-white/70 px-5 py-5">
          <div>{renderMarkdown(analysis)}</div>
        </div>
      )}
    </div>
  );
}
