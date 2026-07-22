"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { safeStorageName } from "@/lib/storage";
import { sections } from "@/lib/sections";
import { CheckCircle, AlertCircle, Send, ArrowLeft, Loader2, Users, RefreshCw, Upload, FileText, FolderDown, Monitor, ArrowRight } from "lucide-react";
import ProjectDocumentsPanel from "@/components/ProjectDocumentsPanel";

type Decision = "accepted" | "corrections";

interface DraftSection {
  id: string;
  section_key: string;
  decision: Decision;
  standard_comments: string[];
  custom_comment: string;
  confirmed_by: string[];
  updated_at: string;
}

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  return document.cookie.split("; ").find((r) => r.startsWith(name + "="))?.split("=")[1]?.split(";")[0] ?? "";
}

export default function GroupReviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();

  const [project, setProject]           = useState<{ id: string; title: string; researcher_name: string; reviewer: string | null; reviewer2: string | null; current_round: number | null } | null>(null);
  const [drafts, setDrafts]             = useState<DraftSection[]>([]);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [otherEmail, setOtherEmail]     = useState<string | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [done, setDone]                 = useState(false);
  const [outcome, setOutcome]           = useState<"accepted" | "corrections" | null>(null);
  const [saving, setSaving]             = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastEditRef = useRef(0);

  // Which review system is active (null = chooser screen)
  const [system, setSystem] = useState<"document" | "pauta" | null>(null);

  // Reviewer-uploaded commented documents (sent to the researcher with the outcome)
  const [fbDocs, setFbDocs]             = useState<{ id: string; file_name: string }[]>([]);
  const [fbUploading, setFbUploading]   = useState(false);
  const [fbError, setFbError]           = useState("");

  const round = project?.current_round ?? 1;

  const loadFeedbackDocs = useCallback(async () => {
    if (!projectId) return;
    const supabase = getSupabase();
    const { data } = await supabase
      .from("documents")
      .select("id, file_name")
      .eq("project_id", projectId)
      .eq("doc_type", "review_feedback")
      .like("file_path", `%/review-feedback/r${round}/%`);
    setFbDocs(data ?? []);
  }, [projectId, round]);

  useEffect(() => { loadFeedbackDocs(); }, [loadFeedbackDocs]);

  async function handleFeedbackUpload(file: File) {
    setFbUploading(true);
    setFbError("");
    const supabase = getSupabase();
    const path = `${projectId}/review-feedback/r${round}/${Date.now()}_${safeStorageName(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      setFbError(`No se pudo subir el documento: ${uploadError.message}`);
      setFbUploading(false);
      return;
    }
    // Registro por el servidor: `documents` ya no es escribible desde el
      // navegador. La sesion de revisor autoriza la operacion.
      const resDoc = await fetch(`/api/projects/${projectId}/documents`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_type:  "review_feedback",
          file_name: `${reviewerName} - ${file.name}`,
          file_path: path,
        }),
      });
      const docError = resDoc.ok ? null : { message: (await resDoc.json().catch(() => ({}))).error ?? "Error al registrar" };
    if (docError) setFbError(`No se pudo registrar el documento: ${docError.message}`);
    await loadFeedbackDocs();
    setFbUploading(false);
  }

  const loadDrafts = useCallback(async () => {
    if (!projectId) return;
    const res = await fetch(`/api/projects/${projectId}/group-draft?round=${round}`);
    if (!res.ok) return;
    const data = await res.json();
    // Don't clobber local edits while a save may still be in flight
    if (Date.now() - lastEditRef.current < 4000) return;
    setDrafts(data);
  }, [projectId, round]);

  useEffect(() => {
    const name  = decodeURIComponent(getCookie("reviewer_name"));
    const email = decodeURIComponent(getCookie("reviewer_email"));
    if (!name || !email) { router.push("/revisores"); return; }
    setReviewerName(name);
    setReviewerEmail(email);

    const supabase = getSupabase();
    supabase.from("projects").select("id,title,researcher_name,reviewer,reviewer2,current_round").eq("id", projectId).single()
      .then(({ data }) => {
        if (!data) { router.push("/revisores/dashboard"); return; }
        setProject(data);

        // Get other reviewer's email
        const otherName = data.reviewer === name ? data.reviewer2 : data.reviewer;
        if (otherName) {
          fetch("/api/reviewers").then((r) => r.json()).then((reviewers: { name: string; email: string }[]) => {
            const other = reviewers.find((r) => r.name === otherName);
            setOtherEmail(other?.email ?? null);
          });
        }
      });
  }, [projectId, router]);

  useEffect(() => {
    loadDrafts();
    pollRef.current = setInterval(loadDrafts, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadDrafts]);

  async function updateSection(sectionKey: string, field: Partial<DraftSection>) {
    lastEditRef.current = Date.now();
    setSaving(sectionKey);
    setDrafts((prev) => prev.map((d) => d.section_key === sectionKey ? { ...d, ...field } : d));
    await fetch(`/api/projects/${projectId}/group-draft`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ round, section_key: sectionKey, ...drafts.find((d) => d.section_key === sectionKey), ...field }),
    });
    setSaving(null);
  }

  function toggleStandardComment(sectionKey: string, comment: string) {
    const draft = drafts.find((d) => d.section_key === sectionKey);
    if (!draft) return;
    const current = draft.standard_comments ?? [];
    const updated = current.includes(comment) ? current.filter((c) => c !== comment) : [...current, comment];
    updateSection(sectionKey, { standard_comments: updated, decision: updated.length > 0 ? "corrections" : draft.decision });
  }

  async function handleConfirm() {
    setSubmitting(true);
    const res = await fetch(`/api/projects/${projectId}/group-draft/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // La identidad la toma el servidor de la sesión firmada.
      body: JSON.stringify({ origin: window.location.origin }),
    });
    const data = await res.json();
    if (res.ok) {
      if (data.status === "submitted") {
        setOutcome(data.outcome);
        setDone(true);
      } else {
        // waiting for other reviewer
        await loadDrafts();
        setSubmitting(false);
      }
    } else {
      setSubmitting(false);
    }
  }

  const myConfirmed = drafts.length > 0 && drafts.every((d) => (d.confirmed_by ?? []).includes(reviewerEmail));
  const otherConfirmed = otherEmail ? drafts.length > 0 && drafts.every((d) => (d.confirmed_by ?? []).includes(otherEmail)) : false;

  // Pseudo-section holding the overall decision of the commented-document system
  const generalDraft = drafts.find((d) => d.section_key === "general");

  if (done) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${outcome === "accepted" ? "bg-emerald-100" : "bg-orange-100"}`}>
            {outcome === "accepted" ? <CheckCircle className="w-10 h-10 text-emerald-600" /> : <AlertCircle className="w-10 h-10 text-orange-600" />}
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            {outcome === "accepted" ? "¡Proyecto aprobado!" : "Correcciones enviadas"}
          </h1>
          <p className="text-slate-500 mb-6">La revisión grupal fue completada y el investigador ha sido notificado.</p>
          <button onClick={() => router.push("/revisores/dashboard")} className="bg-[#1A1A1A] text-white font-bold px-6 py-3 rounded-xl">
            Volver al panel
          </button>
        </div>
      </div>
    );
  }

  if (!project) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => router.push("/revisores/dashboard")} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-sm mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver al panel
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-violet-100 text-violet-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Revisión grupal
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-800 leading-snug">{project.title}</h1>
            <p className="text-slate-400 text-sm mt-1">{project.researcher_name} · Ronda {round}</p>
          </div>
        </div>
      </div>

      {/* Confirmation status */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-6 flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${myConfirmed ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
            {myConfirmed ? "✓" : "?"}
          </div>
          <span className="font-medium text-slate-700">{reviewerName} <span className="text-slate-400 font-normal">(tú)</span></span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${myConfirmed ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
            {myConfirmed ? "Confirmado" : "Pendiente"}
          </span>
        </div>
        {project.reviewer2 && (
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${otherConfirmed ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
              {otherConfirmed ? "✓" : "?"}
            </div>
            <span className="font-medium text-slate-700">
              {project.reviewer === reviewerName ? project.reviewer2 : project.reviewer}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${otherConfirmed ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
              {otherConfirmed ? "Confirmado" : "Pendiente"}
            </span>
          </div>
        )}
        <button onClick={loadDrafts} className="ml-auto text-slate-300 hover:text-slate-500 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Documents uploaded by the researcher */}
      <ProjectDocumentsPanel projectId={project.id} />

      {/* ══ System chooser — one screen to pick between the two systems ══ */}
      {system === null && (
        <>
          <div className="text-center mb-10 mt-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Sistemas de revisión</p>
            <h2 className="text-xl font-bold text-[#1A1A1A]">¿Cómo quieren revisar este proyecto?</h2>
            <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">
              Elijan uno de los dos sistemas. Pueden cambiar de sistema en cualquier momento y lo registrado en cada uno se incluirá en el resultado.
            </p>
          </div>

          {/* Sistema 1 — documento comentado (recomendado) */}
          <button
            onClick={() => setSystem("document")}
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
                  Descarguen los documentos del proyecto, revísenlos en su equipo y suban un documento con sus comentarios. Se enviará automáticamente al investigador/a junto con el resultado.
                </p>
                <div className="inline-flex items-center gap-1.5 bg-[#CC5200] group-hover:bg-[#B34700] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">
                  Revisar con documento <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </button>

          {/* Sistema 2 — pauta en la plataforma (alternativa) */}
          <button
            onClick={() => setSystem("pauta")}
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
                  Evalúen juntos cada sección del formulario UAI directamente en el sistema, con criterios y correcciones estándar para cada sección de la pauta.
                </p>
                <div className="flex items-center gap-1.5 text-slate-500 group-hover:text-slate-700 text-sm font-semibold transition-colors">
                  Revisar con la pauta <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </button>
        </>
      )}

      {/* ══ Active system badge + switcher ══ */}
      {system !== null && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border ${
            system === "document"
              ? "bg-orange-50 border-orange-200 text-[#CC5200]"
              : "bg-slate-100 border-slate-200 text-slate-600"
          }`}>
            {system === "document" ? <FolderDown className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
            {system === "document" ? "Sistema 1 · Documento comentado" : "Sistema 2 · Pauta en plataforma"}
          </div>
          <button
            onClick={() => setSystem(null)}
            className="text-xs text-slate-400 hover:text-[#CC5200] font-medium transition-colors"
          >
            Cambiar de sistema
          </button>
        </div>
      )}

      {/* ══ SISTEMA 1: commented document + overall decision ══ */}
      {system === "document" && (
        <>
          {/* Overall decision (stored in the "general" pseudo-section draft) */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-6">
            <h3 className="font-semibold text-slate-700 text-sm mb-1">Evaluación general del proyecto</h3>
            <p className="text-xs text-slate-400 mb-4">
              Tras revisar los documentos, registren la decisión conjunta. Se guarda automáticamente para ambos revisores.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => updateSection("general", { decision: "accepted", standard_comments: [], custom_comment: "" })}
                className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${
                  generalDraft?.decision === "accepted"
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50"
                }`}
              >
                <CheckCircle className={`w-7 h-7 ${generalDraft?.decision === "accepted" ? "text-emerald-500" : "text-slate-300"}`} />
                <span className={`text-sm font-bold ${generalDraft?.decision === "accepted" ? "text-emerald-700" : "text-slate-500"}`}>
                  Aprobar proyecto
                </span>
                <span className="text-xs text-slate-400 text-center leading-snug">El proyecto cumple los criterios éticos</span>
              </button>
              <button
                onClick={() => updateSection("general", { decision: "corrections" })}
                className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${
                  generalDraft?.decision === "corrections"
                    ? "border-orange-400 bg-orange-50"
                    : "border-slate-100 hover:border-orange-200 hover:bg-orange-50/50"
                }`}
              >
                <AlertCircle className={`w-7 h-7 ${generalDraft?.decision === "corrections" ? "text-[#CC5200]" : "text-slate-300"}`} />
                <span className={`text-sm font-bold ${generalDraft?.decision === "corrections" ? "text-[#CC5200]" : "text-slate-500"}`}>
                  Solicitar correcciones
                </span>
                <span className="text-xs text-slate-400 text-center leading-snug">El proyecto requiere ajustes</span>
              </button>
            </div>
            {generalDraft?.decision === "corrections" && (
              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Observaciones generales (se envían al investigador/a)
                </label>
                <textarea
                  value={generalDraft?.custom_comment ?? ""}
                  onChange={(e) => updateSection("general", { custom_comment: e.target.value })}
                  rows={4}
                  placeholder="Describan las correcciones requeridas, o súbanlas como documento comentado más abajo..."
                  className="w-full border border-orange-200 bg-orange-50/30 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#CC5200] resize-none"
                />
              </div>
            )}
            {saving === "general" && <p className="text-xs text-slate-300 mt-2">Guardando...</p>}
          </div>

          {/* Reviewer-commented document upload */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-6">
            <div className="flex items-center gap-2.5 mb-1">
              <FileText className="w-4 h-4 text-[#CC5200]" />
              <h3 className="font-semibold text-slate-700 text-sm">Documento con comentarios</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 ml-[26px]">
              Suban un documento revisado con sus comentarios (PDF o Word). Se enviará al investigador/a junto con el resultado de la revisión.
            </p>

            {fbDocs.length > 0 && (
              <div className="space-y-1.5 mb-3 ml-[26px]">
                {fbDocs.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="text-xs font-medium text-slate-700 truncate">{d.file_name}</span>
                  </div>
                ))}
              </div>
            )}

            {fbError && <p className="text-xs text-red-500 mb-2 ml-[26px]">{fbError}</p>}

            <label className={`ml-[26px] inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition-colors ${
              fbUploading ? "bg-slate-100 text-slate-400" : "bg-[#CC5200] hover:bg-[#B34700] text-white"
            }`}>
              {fbUploading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Subiendo...</>
                : <><Upload className="w-3.5 h-3.5" /> {fbDocs.length > 0 ? "Subir otro documento" : "Subir documento"}</>}
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx"
                disabled={fbUploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFeedbackUpload(f); e.target.value = ""; }}
              />
            </label>
          </div>
        </>
      )}

      {/* ══ SISTEMA 2: section-by-section pauta ══ */}
      {system === "pauta" && (
      <div className="space-y-4 mb-8">
        {sections.map((section) => {
          const draft = drafts.find((d) => d.section_key === section.key);
          if (!draft) return null;
          const isSaving = saving === section.key;

          return (
            <div key={section.key} className={`bg-white rounded-2xl border-2 transition-all ${draft.decision === "corrections" ? "border-orange-200" : "border-slate-100"}`}>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm">{section.label}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{section.description}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => updateSection(section.key, { decision: "accepted", standard_comments: [], custom_comment: "" })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${draft.decision === "accepted" ? "bg-emerald-50 border-emerald-400 text-emerald-700" : "border-slate-200 text-slate-400 hover:border-slate-300"}`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Acepta
                    </button>
                    <button
                      onClick={() => updateSection(section.key, { decision: "corrections" })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${draft.decision === "corrections" ? "bg-orange-50 border-orange-400 text-orange-700" : "border-slate-200 text-slate-400 hover:border-slate-300"}`}
                    >
                      <AlertCircle className="w-3.5 h-3.5" /> Correcciones
                    </button>
                  </div>
                </div>

                {draft.decision === "corrections" && (
                  <div className="space-y-2 mt-3">
                    {section.standardCorrections?.map((correction) => (
                      <label key={correction} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={(draft.standard_comments ?? []).includes(correction)}
                          onChange={() => toggleStandardComment(section.key, correction)}
                          className="mt-0.5 accent-orange-500"
                        />
                        <span className="text-xs text-slate-700">{correction}</span>
                      </label>
                    ))}
                    <textarea
                      value={draft.custom_comment ?? ""}
                      onChange={(e) => updateSection(section.key, { custom_comment: e.target.value })}
                      placeholder="Comentario adicional..."
                      rows={2}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none mt-1"
                    />
                  </div>
                )}

                {isSaving && <p className="text-xs text-slate-300 mt-2">Guardando...</p>}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Confirm button */}
      {system !== null && (!myConfirmed ? (
        <div className="sticky bottom-6">
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-lg shadow-xl shadow-violet-200 transition-all"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            OK — Confirmar mi revisión
          </button>
          <p className="text-center text-xs text-slate-400 mt-2">
            {project.reviewer2
              ? "Ambos revisores deben confirmar para enviar la revisión al investigador"
              : "Al confirmar se enviará la revisión al investigador"}
          </p>
        </div>
      ) : (
        <div className="sticky bottom-6">
          <div className="w-full bg-emerald-50 border-2 border-emerald-200 text-emerald-700 font-bold py-4 rounded-2xl text-center">
            ✓ Tu revisión está confirmada
            {!otherConfirmed && project.reviewer2 && (
              <p className="text-xs font-normal text-emerald-500 mt-1">Esperando confirmación del otro revisor...</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
