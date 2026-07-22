"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabase, type Project } from "@/lib/supabase";
import { safeStorageName } from "@/lib/storage";
import { sections } from "@/lib/sections";
import {
  CheckCircle, AlertCircle, ChevronDown, ChevronUp, Send, ArrowLeft,
  Loader2, Monitor, FolderDown, ArrowRight, Users, UserCheck,
  Upload, FileText, X,
} from "lucide-react";
import AiAnalysisPanel from "@/components/AiAnalysisPanel";
import ProjectMessages from "@/components/ProjectMessages";
import ProjectDocumentsPanel from "@/components/ProjectDocumentsPanel";

type Decision   = "accepted" | "corrections" | null;
type ReviewMode = "platform" | "download" | null;

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

  const [project, setProject]           = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [sectionState, setSectionState] = useState<Record<string, SectionState>>(initState);
  const [submitting, setSubmitting]     = useState(false);
  const [submitError, setSubmitError]   = useState("");
  const [done, setDone]                 = useState(false);

  // Step 0: joint vs individual (null = not chosen yet)
  const [jointChoice, setJointChoice] = useState<"joint" | "individual" | null>(null);

  // Mode & download-mode states
  const [mode, setMode]                       = useState<ReviewMode>(null);
  const [downloadDecision, setDownloadDecision] = useState<"accepted" | "corrections" | null>(null);
  const [downloadComment, setDownloadComment]   = useState("");
  const [feedbackFile, setFeedbackFile]         = useState<File | null>(null);

  useEffect(() => {
    setReviewerName(decodeURIComponent(getCookie("reviewer_name")));
    setReviewerEmail(decodeURIComponent(getCookie("reviewer_email")));
  }, []);

  const loadProject = useCallback(async () => {
    const supabase = getSupabase();
    // Por endpoint: `projects` deja de leerse desde el navegador.
    const resProj = await fetch(`/api/projects/${projectId}`);
    const data = resProj.ok ? (await resProj.json()).project : null;
    setProject(data);
    setLoadingProject(false);
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
        customComment:       decision === "accepted" ? "" : prev[key].customComment,
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

  async function handlePlatformSubmit() {
    if (!project) return;
    setSubmitting(true);
    setSubmitError("");

    const payload = {
      project_id:    project.id,
      // La identidad la toma el servidor de la sesión firmada.
      round:         project.current_round ?? 1,
      origin:        window.location.origin,
      sections: sections.map((s) => ({
        section_key:       s.key,
        decision:          sectionState[s.key].decision!,
        standard_comments: sectionState[s.key].selectedCorrections,
        custom_comment:    sectionState[s.key].customComment,
      })),
    };

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) { setDone(true); }
    else {
      const data = await res.json();
      setSubmitError(data.error ?? "Error al enviar la revisión.");
    }
    setSubmitting(false);
  }

  async function handleDownloadSubmit() {
    if (!project || !downloadDecision) return;
    setSubmitting(true);
    setSubmitError("");

    // Upload the reviewer's commented document (sent to the researcher).
    // Stored in the documents table with the reviewer's name prefixed so
    // emails and tracking can attribute it without schema changes.
    if (feedbackFile) {
      const supabase = getSupabase();
      const round = project.current_round ?? 1;
      const path = `${project.id}/review-feedback/r${round}/${Date.now()}_${safeStorageName(feedbackFile.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, feedbackFile, { upsert: true });
      if (uploadError) {
        setSubmitError(`No se pudo subir tu documento: ${uploadError.message}`);
        setSubmitting(false);
        return;
      }
      // Registro por el servidor: `documents` ya no es escribible desde el
      // navegador. La sesion de revisor autoriza la operacion.
      const resDoc = await fetch(`/api/projects/${project.id}/documents`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_type:  "review_feedback",
          file_name: `${reviewerName} - ${feedbackFile.name}`,
          file_path: path,
        }),
      });
      const docError = resDoc.ok ? null : { message: (await resDoc.json().catch(() => ({}))).error ?? "Error al registrar" };
      if (docError) {
        setSubmitError(`No se pudo registrar tu documento: ${docError.message}`);
        setSubmitting(false);
        return;
      }
    }

    const payload = {
      project_id:    project.id,
      // La identidad la toma el servidor de la sesión firmada.
      round:         project.current_round ?? 1,
      origin:        window.location.origin,
      // Single overall evaluation (pseudo-section "general")
      sections: [{
        section_key:       "general",
        decision:          downloadDecision,
        standard_comments: [] as string[],
        custom_comment:    downloadComment.trim(),
      }],
    };

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) { setDone(true); }
    else {
      const data = await res.json();
      setSubmitError(data.error ?? "Error al enviar la revisión.");
    }
    setSubmitting(false);
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (done) {
    const hasCoReviewer = !!(project?.reviewer && project?.reviewer2);
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-12 max-w-md text-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-3">Revisión enviada</h2>
          <p className="text-slate-500 text-sm mb-8">
            {hasCoReviewer
              ? "Tu revisión fue registrada. El investigador será notificado cuando el otro revisor también complete su evaluación."
              : "Tu revisión fue registrada. El investigador será notificado automáticamente."}
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

  // ── Shared: back button + project header ──────────────────────────────────
  const nav = (
    <button
      onClick={() => router.push("/revisores/dashboard")}
      className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-sm font-medium mb-8 transition-colors"
    >
      <ArrowLeft className="w-4 h-4" /> Volver al dashboard
    </button>
  );

  const coReviewer =
    project.reviewer === reviewerName  ? project.reviewer2 :
    project.reviewer2 === reviewerName ? project.reviewer  : null;

  const currentRound = project.current_round ?? 1;

  const projectHeader = (
    <div className="bg-[#1A1A1A] rounded-2xl p-6 mb-8 text-white">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[#CC5200] text-xs font-bold uppercase tracking-widest">
          Revisando como: {reviewerName}
        </p>
        {currentRound > 1 && (
          <span className="bg-violet-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            Ronda {currentRound}
          </span>
        )}
      </div>
      <h1 className="font-bold text-lg leading-snug mb-2">{project.title}</h1>
      <p className="text-slate-400 text-sm">
        {project.researcher_name} · {project.project_type}
        {currentRound > 1 && <span className="text-violet-400 font-semibold"> · Nueva revisión requerida (Ronda {currentRound})</span>}
      </p>
      {coReviewer && (
        <p className="text-slate-400 text-xs mt-1.5 flex items-center gap-1.5">
          <span className="w-4 h-4 bg-emerald-500 rounded-full inline-flex items-center justify-center text-[9px] font-bold">2</span>
          Co-revisor/a: <span className="text-white font-medium">{coReviewer}</span>
        </p>
      )}
    </div>
  );

  // ── Mode selector badge (shown while in a mode) ───────────────────────────
  const modeBadge = mode && (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border ${
        mode === "download"
          ? "bg-orange-50 border-orange-200 text-[#CC5200]"
          : "bg-slate-100 border-slate-200 text-slate-600"
      }`}>
        {mode === "download" ? <FolderDown className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
        {mode === "download" ? "Sistema 1 · Documento comentado" : "Sistema 2 · Pauta en plataforma"}
      </div>
      <div className="flex items-center gap-1.5 text-xs bg-orange-50 border border-orange-200 text-[#CC5200] font-semibold px-3 py-1.5 rounded-lg">
        <UserCheck className="w-3.5 h-3.5" /> Individual
      </div>
      <button
        onClick={() => setMode(null)}
        className="text-xs text-slate-400 hover:text-[#CC5200] font-medium transition-colors"
      >
        Cambiar modo
      </button>
      {coReviewer && (
        <button
          onClick={() => { setMode(null); setJointChoice(null); }}
          className="text-xs text-slate-400 hover:text-[#CC5200] font-medium transition-colors"
        >
          Cambiar modalidad
        </button>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 0: JOINT VS INDIVIDUAL (only when co-reviewer exists)
  // ══════════════════════════════════════════════════════════════════════════
  if (coReviewer && jointChoice === null) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        {nav}
        {projectHeader}

        {/* Documents always available, from the very first step */}
        <ProjectDocumentsPanel projectId={project.id} />

        <div className="text-center mb-8">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Modalidad de revisión{currentRound > 1 ? ` · Ronda ${currentRound}` : ""}
          </p>
          <h2 className="text-xl font-bold text-[#1A1A1A]">¿Cómo quieren revisar este proyecto?</h2>
          <p className="text-slate-400 text-sm mt-2">
            Coordínate con tu co-revisor/a <strong className="text-slate-600">{coReviewer}</strong> antes de elegir
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Joint review */}
          <button
            onClick={() => router.push(`/revisores/review/${project.id}/group`)}
            className="group bg-white border-2 border-slate-100 hover:border-emerald-400 rounded-2xl p-6 text-left transition-all hover:shadow-md"
          >
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="font-bold text-[#1A1A1A] text-base mb-2">Revisar juntos</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-5">
              Ambos revisores evalúan en tiempo real en un espacio compartido. Las decisiones se consensúan sección por sección y la revisión final se envía cuando ambos confirman.
            </p>
            <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-semibold">
              Revisión conjunta <ArrowRight className="w-4 h-4" />
            </div>
          </button>

          {/* Individual review */}
          <button
            onClick={() => setJointChoice("individual")}
            className="group bg-white border-2 border-slate-100 hover:border-[#CC5200] rounded-2xl p-6 text-left transition-all hover:shadow-md"
          >
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-100 transition-colors">
              <UserCheck className="w-6 h-6 text-[#CC5200]" />
            </div>
            <h3 className="font-bold text-[#1A1A1A] text-base mb-2">Revisar por separado</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-5">
              Cada revisor evalúa de forma independiente. El resultado solo se notifica al investigador/a cuando <strong>ambos revisores</strong> hayan completado su evaluación.
            </p>
            <div className="flex items-center gap-1.5 text-[#CC5200] text-sm font-semibold">
              Revisión individual <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4">
          <p className="text-xs text-blue-600 leading-relaxed">
            <strong>Modo separado:</strong> el investigador/a no recibirá ninguna notificación hasta que tanto tú como <strong>{coReviewer}</strong> hayan enviado sus evaluaciones individuales.
          </p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MODE SELECTION SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (mode === null) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        {nav}
        {projectHeader}

        {/* Documents panel — always visible before choosing mode */}
        <ProjectDocumentsPanel projectId={project.id} />

        {coReviewer && (
          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center gap-1.5 text-xs bg-orange-50 border border-orange-200 text-[#CC5200] font-semibold px-3 py-1.5 rounded-lg">
              <UserCheck className="w-3.5 h-3.5" /> Revisión individual
            </div>
            <button
              onClick={() => setJointChoice(null)}
              className="text-xs text-slate-400 hover:text-[#CC5200] font-medium transition-colors"
            >
              Cambiar modalidad
            </button>
          </div>
        )}

        <div className="text-center mb-10">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Sistemas de revisión</p>
          <h2 className="text-xl font-bold text-[#1A1A1A]">¿Cómo quieres revisar este proyecto?</h2>
          <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">
            Elige uno de los dos sistemas para entregar tu evaluación.
          </p>
        </div>

        {/* Sistema 1 — documento comentado (recomendado) */}
        <button
          onClick={() => setMode("download")}
          className="group relative w-full text-left bg-gradient-to-br from-orange-50 via-white to-white border-2 border-[#CC5200] rounded-3xl p-7 mb-5 shadow-lg shadow-orange-100/70 hover:shadow-xl hover:shadow-orange-100 hover:-translate-y-0.5 transition-all"
        >
          <span className="absolute -top-3 left-7 bg-[#CC5200] text-white text-[10px] font-bold uppercase tracking-widest px-3.5 py-1 rounded-full shadow-sm">
            ★ Recomendado
          </span>
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 bg-[#CC5200] rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-orange-200 group-hover:scale-105 transition-transform">
              <FolderDown className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <h3 className="font-bold text-[#1A1A1A] text-lg">Documento comentado</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest bg-orange-100 text-[#CC5200] px-2.5 py-1 rounded-full">Sistema 1</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">
                Descarga los documentos del proyecto, revísalos en tu equipo y sube un documento con tus comentarios. Se enviará automáticamente al investigador/a junto con tu evaluación.
              </p>
              <div className="inline-flex items-center gap-1.5 bg-[#CC5200] group-hover:bg-[#B34700] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">
                Revisar con documento <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </button>

        {/* Sistema 2 — pauta en la plataforma (alternativa) */}
        <button
          onClick={() => setMode("platform")}
          className="group w-full text-left bg-white border-2 border-slate-100 hover:border-slate-300 rounded-3xl p-6 transition-all hover:shadow-md"
        >
          <div className="flex items-start gap-5">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition-colors">
              <Monitor className="w-6 h-6 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <h3 className="font-bold text-[#1A1A1A] text-base">Pauta en la plataforma</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">Sistema 2 · Alternativa</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-3">
                Evalúa sección por sección el formulario UAI directamente en el sistema, con criterios y correcciones estándar para cada sección de la pauta.
              </p>
              <div className="flex items-center gap-1.5 text-slate-500 group-hover:text-slate-700 text-sm font-semibold transition-colors">
                Revisar con la pauta <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </button>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PLATFORM MODE — section-by-section review
  // ══════════════════════════════════════════════════════════════════════════
  if (mode === "platform") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        {nav}
        {projectHeader}
        {modeBadge}

        {/* AI Analysis */}
        <AiAnalysisPanel title={project.title} abstract={project.abstract} mode="revisor" />

        {/* Documents panel */}
        <ProjectDocumentsPanel projectId={project.id} />

        {/* Messages */}
        <ProjectMessages projectId={project.id} role="reviewer" />

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
            const state         = sectionState[section.key];
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

                  {/* Section content guide */}
                  <div className="ml-10 mt-2.5 space-y-2">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Contenido evaluado</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{section.description}</p>
                    </div>
                    {section.criteria && section.criteria.length > 0 && (
                      <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-100">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-1.5">Criterios de aceptación</p>
                        <ul className="space-y-1">
                          {section.criteria.map((c, ci) => (
                            <li key={ci} className="flex items-start gap-1.5 text-xs text-slate-600">
                              <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

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
                        {state.expanded
                          ? <ChevronUp className="w-4 h-4" />
                          : <ChevronDown className="w-4 h-4" />}
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
                            <span className={`text-sm leading-snug transition-colors ${
                              checked ? "text-[#1A1A1A] font-medium" : "text-slate-500 group-hover:text-slate-700"
                            }`}>
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

        {/* Co-reviewer notice for individual mode */}
        {coReviewer && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
            <Users className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-600 leading-relaxed">
              Revisión <strong>individual</strong>: el investigador/a recibirá el resultado solo cuando <strong>{coReviewer}</strong> también envíe su evaluación.
            </p>
          </div>
        )}

        {/* Submit */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">
            {submitError}
          </div>
        )}
        {!allDone && (
          <p className="text-center text-sm text-slate-400 mb-4">
            Debes revisar todas las secciones antes de enviar (
            {sections.length - completedCount} pendiente{sections.length - completedCount !== 1 ? "s" : ""}).
          </p>
        )}
        <button
          onClick={handlePlatformSubmit}
          disabled={!allDone || submitting}
          className="w-full flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-colors shadow-sm text-sm"
        >
          {submitting
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Enviando revisión...</>
            : <><Send className="w-5 h-5" /> Enviar revisión completa</>}
        </button>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DOWNLOAD MODE — download docs + simplified overall review
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {nav}
      {projectHeader}
      {modeBadge}

      {/* Documents list */}
      <ProjectDocumentsPanel projectId={project.id} />

      {/* Messages */}
      <ProjectMessages projectId={project.id} role="reviewer" />

      {/* Simplified decision form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <h3 className="font-bold text-[#1A1A1A] text-sm mb-1">Evaluación general del proyecto</h3>
        <p className="text-xs text-slate-400 mb-5">
          Tras revisar los documentos descargados, ingresa tu evaluación general.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => setDownloadDecision("accepted")}
            className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${
              downloadDecision === "accepted"
                ? "border-emerald-400 bg-emerald-50"
                : "border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50"
            }`}
          >
            <CheckCircle className={`w-7 h-7 ${
              downloadDecision === "accepted" ? "text-emerald-500" : "text-slate-300"
            }`} />
            <span className={`text-sm font-bold ${
              downloadDecision === "accepted" ? "text-emerald-700" : "text-slate-500"
            }`}>
              Aprobar proyecto
            </span>
            <span className="text-xs text-slate-400 text-center leading-snug">
              El proyecto cumple los criterios éticos
            </span>
          </button>

          <button
            onClick={() => setDownloadDecision("corrections")}
            className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${
              downloadDecision === "corrections"
                ? "border-orange-400 bg-orange-50"
                : "border-slate-100 hover:border-orange-200 hover:bg-orange-50/50"
            }`}
          >
            <AlertCircle className={`w-7 h-7 ${
              downloadDecision === "corrections" ? "text-[#CC5200]" : "text-slate-300"
            }`} />
            <span className={`text-sm font-bold ${
              downloadDecision === "corrections" ? "text-[#CC5200]" : "text-slate-500"
            }`}>
              Solicitar correcciones
            </span>
            <span className="text-xs text-slate-400 text-center leading-snug">
              El proyecto requiere ajustes
            </span>
          </button>
        </div>

        {downloadDecision === "corrections" && (
          <div className="mb-5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Observaciones y correcciones solicitadas
              {!feedbackFile && <span className="text-red-400"> *</span>}
            </label>
            <textarea
              value={downloadComment}
              onChange={(e) => setDownloadComment(e.target.value)}
              rows={5}
              placeholder="Describe las correcciones requeridas, indicando las secciones del formulario UAI que deben modificarse..."
              className="w-full border border-orange-200 bg-orange-50/30 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#CC5200] resize-none"
            />
          </div>
        )}

        {/* Reviewer's commented document — sent to the researcher */}
        {downloadDecision && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Documento con tus comentarios
              {downloadDecision === "corrections" && !downloadComment.trim()
                ? <span className="text-red-400"> *</span>
                : <span className="text-slate-300 normal-case font-medium"> (opcional)</span>}
            </label>
            <p className="text-xs text-slate-400 mb-3">
              Sube el documento revisado con tus comentarios (PDF o Word). Se enviará al investigador/a junto con tu evaluación.
            </p>
            {!feedbackFile ? (
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-6 cursor-pointer hover:border-[#CC5200] hover:bg-orange-50/40 transition-all">
                <Upload className="w-6 h-6 text-slate-300" />
                <span className="text-sm font-medium text-[#CC5200]">Seleccionar archivo</span>
                <span className="text-xs text-slate-400">PDF o Word</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => { setFeedbackFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
                />
              </label>
            ) : (
              <div className="flex items-center justify-between bg-orange-50/60 border border-orange-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-[#CC5200] shrink-0" />
                  <span className="text-sm font-medium text-slate-700 truncate">{feedbackFile.name}</span>
                </div>
                <button onClick={() => setFeedbackFile(null)} className="text-slate-400 hover:text-red-500 transition-colors ml-2 shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Co-reviewer notice for individual mode */}
      {coReviewer && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
          <Users className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-600 leading-relaxed">
            Revisión <strong>individual</strong>: el investigador/a recibirá el resultado solo cuando <strong>{coReviewer}</strong> también envíe su evaluación.
          </p>
        </div>
      )}

      {/* Submit */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">
          {submitError}
        </div>
      )}
      {downloadDecision === "corrections" && !downloadComment.trim() && !feedbackFile && (
        <p className="text-center text-sm text-orange-500 mb-4">
          Debes escribir las observaciones o subir un documento con tus comentarios antes de enviar.
        </p>
      )}

      <button
        onClick={handleDownloadSubmit}
        disabled={
          !downloadDecision || submitting ||
          (downloadDecision === "corrections" && !downloadComment.trim() && !feedbackFile)
        }
        className="w-full flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-colors shadow-sm text-sm"
      >
        {submitting
          ? <><Loader2 className="w-5 h-5 animate-spin" /> Enviando evaluación...</>
          : <><Send className="w-5 h-5" /> Enviar evaluación</>}
      </button>
    </div>
  );
}
