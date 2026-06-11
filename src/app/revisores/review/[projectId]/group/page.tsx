"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { sections } from "@/lib/sections";
import { CheckCircle, AlertCircle, Send, ArrowLeft, Loader2, Users, RefreshCw } from "lucide-react";
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

  const round = project?.current_round ?? 1;

  const loadDrafts = useCallback(async () => {
    if (!projectId) return;
    const res = await fetch(`/api/projects/${projectId}/group-draft?round=${round}`);
    if (res.ok) setDrafts(await res.json());
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
      body: JSON.stringify({ reviewer_name: reviewerName, reviewer_email: reviewerEmail, origin: window.location.origin }),
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

      {/* Sections */}
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

      {/* Confirm button */}
      {!myConfirmed ? (
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
      )}
    </div>
  );
}
