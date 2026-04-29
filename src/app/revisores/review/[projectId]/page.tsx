"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabase, type Project } from "@/lib/supabase";
import { sections } from "@/lib/sections";
import { CheckCircle, AlertCircle, ChevronDown, ChevronUp, Send, ArrowLeft, Loader2, FileText, Download, Eye, X, ExternalLink } from "lucide-react";

const docLabels: Record<string, string> = {
  protocol:    "Protocolo de investigación",
  consent:     "Consentimiento informado",
  assent:      "Asentimiento informado",
  instruments: "Instrumentos / tests a utilizar",
};

type Decision = "accepted" | "corrections" | null;

interface SectionState {
  decision: Decision;
  selectedCorrections: string[];
  customComment: string;
  expanded: boolean;
}

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith(name + "="))
      ?.split("=")[1]
      ?.split(";")[0] ?? ""
  );
}

const initState = (): Record<string, SectionState> =>
  Object.fromEntries(
    sections.map((s) => [
      s.key,
      { decision: null, selectedCorrections: [], customComment: "", expanded: false },
    ])
  );

export default function ReviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();

  const [project, setProject]       = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [reviewerName, setReviewerName]  = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [sectionState, setSectionState]  = useState<Record<string, SectionState>>(initState);
  const [submitting, setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone]              = useState(false);
  const [documents, setDocuments]    = useState<{ id: string; doc_type: string; file_name: string; url: string }[]>([]);
  const [docsOpen, setDocsOpen]      = useState(true);
  const [viewer, setViewer]          = useState<{ url: string; name: string } | null>(null);
  const docsRef                      = useRef<HTMLDivElement>(null);

  const closeViewer = useCallback(() => {
    setViewer(null);
    setTimeout(() => docsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, []);

  // Intercept browser back button while viewer is open
  useEffect(() => {
    if (!viewer) return;
    window.history.pushState({ viewerOpen: true }, "");
    const onPop = () => closeViewer();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [viewer, closeViewer]);

  useEffect(() => {
    setReviewerName(decodeURIComponent(getCookie("reviewer_name")));
    setReviewerEmail(decodeURIComponent(getCookie("reviewer_email")));
  }, []);

  const loadProject = useCallback(async () => {
    const supabase = getSupabase();
    const { data } = await supabase.from("projects").select("*").eq("id", projectId).single();
    setProject(data);
    setLoadingProject(false);

    // Load documents via API (server-side signed URLs)
    const docsRes = await fetch(`/api/projects/${projectId}/documents`);
    if (docsRes.ok) {
      const docsData = await docsRes.json();
      setDocuments(docsData.documents ?? []);
    }
  }, [projectId]);

  useEffect(() => { loadProject(); }, [loadProject]);

  function setDecision(key: string, decision: Decision) {
    setSectionState((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        decision,
        expanded: decision === "corrections",
        selectedCorrections: decision === "accepted" ? [] : prev[key].selectedCorrections,
        customComment: decision === "accepted" ? "" : prev[key].customComment,
      },
    }));
  }

  function toggleCorrection(sectionKey: string, correction: string) {
    setSectionState((prev) => {
      const current = prev[sectionKey].selectedCorrections;
      const next = current.includes(correction)
        ? current.filter((c) => c !== correction)
        : [...current, correction];
      return { ...prev, [sectionKey]: { ...prev[sectionKey], selectedCorrections: next } };
    });
  }

  function toggleExpanded(key: string) {
    setSectionState((prev) => ({
      ...prev,
      [key]: { ...prev[key], expanded: !prev[key].expanded },
    }));
  }

  const completedCount = sections.filter((s) => sectionState[s.key]?.decision !== null).length;
  const allDone = completedCount === sections.length;

  async function handleSubmit() {
    if (!project) return;
    setSubmitting(true);
    setSubmitError("");

    const payload = {
      project_id:    project.id,
      reviewer_name: reviewerName,
      reviewer_email: reviewerEmail,
      round:         project.current_round ?? 1,
      origin:        window.location.origin,
      sections: sections.map((s) => ({
        section_key:         s.key,
        decision:            sectionState[s.key].decision!,
        standard_comments:   sectionState[s.key].selectedCorrections,
        custom_comment:      sectionState[s.key].customComment,
      })),
    };

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setDone(true);
    } else {
      const data = await res.json();
      setSubmitError(data.error ?? "Error al enviar la revisión.");
    }
    setSubmitting(false);
  }

  if (done) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-12 max-w-md text-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-3">Revisión enviada</h2>
          <p className="text-slate-500 text-sm mb-8">
            Tu revisión fue registrada. Si el otro revisor también ha completado su evaluación, el sistema notificará automáticamente al investigador.
          </p>
          <button
            onClick={() => router.push("/revisores/dashboard")}
            className="bg-[#1A1A1A] text-white font-semibold px-8 py-3 rounded-xl hover:bg-black transition-colors"
          >
            Volver al dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loadingProject) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-400">Proyecto no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Back */}
      <button
        onClick={() => router.push("/revisores/dashboard")}
        className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-sm font-medium mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al dashboard
      </button>

      {/* Project header */}
      <div className="bg-[#1A1A1A] rounded-2xl p-6 mb-8 text-white">
        <p className="text-[#CC5200] text-xs font-bold uppercase tracking-widest mb-2">Revisando como: {reviewerName}</p>
        <h1 className="font-bold text-lg leading-snug mb-2">{project.title}</h1>
        <p className="text-slate-400 text-sm">{project.researcher_name} · {project.project_type} · Ronda {project.current_round ?? 1}</p>
      </div>

      {/* Documents panel */}
      <div ref={docsRef} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
          <button
            onClick={() => setDocsOpen((o) => !o)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-[#CC5200]" />
              <span className="font-semibold text-slate-700 text-sm">
                Documentos del proyecto
              </span>
              <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full">
                {documents.length}
              </span>
            </div>
            {docsOpen
              ? <ChevronUp className="w-4 h-4 text-slate-400" />
              : <ChevronDown className="w-4 h-4 text-slate-400" />
            }
          </button>

          {docsOpen && (
            <div className="border-t border-slate-100 divide-y divide-slate-50">
              {documents.length === 0 ? (
                <p className="px-5 py-4 text-sm text-slate-400">Sin documentos adjuntos.</p>
              ) : documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-[#CC5200]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {docLabels[doc.doc_type] ?? doc.doc_type}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{doc.file_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <button
                      onClick={() => setViewer({ url: doc.url, name: doc.file_name })}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#CC5200] border border-slate-200 hover:border-[#CC5200] px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver
                    </button>
                    <a
                      href={doc.url}
                      download={doc.file_name}
                      className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#CC5200] hover:bg-[#B34700] px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Descargar
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-600">Progreso de revisión</span>
          <span className="text-sm font-bold text-[#CC5200]">{completedCount}/{sections.length} secciones</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-[#CC5200] transition-all duration-300"
            style={{ width: `${(completedCount / sections.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4 mb-8">
        {sections.map((section, i) => {
          const state = sectionState[section.key];
          const isAccepted    = state.decision === "accepted";
          const isCorrections = state.decision === "corrections";
          const isPending     = state.decision === null;

          return (
            <div
              key={section.key}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                isAccepted    ? "border-emerald-200" :
                isCorrections ? "border-orange-200" :
                                "border-slate-100"
              }`}
            >
              {/* Section header */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-4 mb-1">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      isAccepted    ? "bg-emerald-100 text-emerald-700" :
                      isCorrections ? "bg-orange-100 text-[#CC5200]" :
                                      "bg-slate-100 text-slate-500"
                    }`}>
                      {i + 1}
                    </span>
                    <h3 className="font-bold text-[#1A1A1A] text-sm">{section.label}</h3>
                  </div>
                  {!isPending && (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                      isAccepted
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-orange-50 text-[#CC5200]"
                    }`}>
                      {isAccepted ? "✓ Aceptada" : "✏ Correcciones"}
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-xs ml-10">{section.description}</p>

                {/* Decision buttons */}
                <div className="flex gap-2 mt-4 ml-10">
                  <button
                    onClick={() => setDecision(section.key, "accepted")}
                    className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all ${
                      isAccepted
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" /> Aceptar
                  </button>
                  <button
                    onClick={() => setDecision(section.key, "corrections")}
                    className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all ${
                      isCorrections
                        ? "bg-[#CC5200] text-white shadow-sm"
                        : "bg-orange-50 text-[#CC5200] hover:bg-orange-100 border border-orange-200"
                    }`}
                  >
                    <AlertCircle className="w-4 h-4" /> Solicitar correcciones
                  </button>
                  {isCorrections && (
                    <button
                      onClick={() => toggleExpanded(section.key)}
                      className="ml-auto text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {state.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Corrections panel */}
              {isCorrections && state.expanded && (
                <div className="border-t border-orange-100 bg-orange-50/50 p-5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                    Correcciones estándar (selecciona las que apliquen):
                  </p>
                  <div className="space-y-2 mb-4">
                    {section.standardCorrections.map((correction) => {
                      const checked = state.selectedCorrections.includes(correction);
                      return (
                        <label key={correction} className="flex items-start gap-2.5 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCorrection(section.key, correction)}
                            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#CC5200] focus:ring-[#CC5200] shrink-0 cursor-pointer"
                          />
                          <span className={`text-sm leading-snug transition-colors ${checked ? "text-[#1A1A1A] font-medium" : "text-slate-500 group-hover:text-slate-700"}`}>
                            {correction}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                      Comentario adicional (opcional):
                    </label>
                    <textarea
                      value={state.customComment}
                      onChange={(e) =>
                        setSectionState((prev) => ({
                          ...prev,
                          [section.key]: { ...prev[section.key], customComment: e.target.value },
                        }))
                      }
                      rows={3}
                      placeholder="Escribe observaciones adicionales específicas para esta sección..."
                      className="w-full border border-orange-200 bg-white rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#CC5200] resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">
          {submitError}
        </div>
      )}

      {!allDone && (
        <p className="text-center text-sm text-slate-400 mb-4">
          Debes revisar todas las secciones antes de enviar ({sections.length - completedCount} pendiente{sections.length - completedCount !== 1 ? "s" : ""}).
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!allDone || submitting}
        className="w-full flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-colors shadow-sm text-sm"
      >
        {submitting
          ? <><Loader2 className="w-5 h-5 animate-spin" /> Enviando revisión...</>
          : <><Send className="w-5 h-5" /> Enviar revisión completa</>}
      </button>

      {/* Document viewer modal */}
      {viewer && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/80"
          onClick={closeViewer}
        >
          <div className="flex items-center justify-between px-5 py-3 bg-[#1A1A1A] shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-[#CC5200]" />
              <span className="text-white text-sm font-semibold truncate max-w-[60vw]">{viewer.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={viewer.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Abrir en nueva pestaña
              </a>
              <button
                onClick={closeViewer}
                className="text-slate-400 hover:text-white transition-colors ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {viewer.name.toLowerCase().endsWith(".pdf") ? (
              <iframe
                src={viewer.url}
                className="w-full h-full border-0"
                title={viewer.name}
              />
            ) : (
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewer.url)}&embedded=true`}
                className="w-full h-full border-0 bg-white"
                title={viewer.name}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
