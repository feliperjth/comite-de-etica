"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabase, type Project, type ProjectStatus } from "@/lib/supabase";
import { getThemeLabel } from "@/lib/themes";
import StatusBadge from "@/components/StatusBadge";
import {
  LogOut, RefreshCw, ClipboardList, Clock, CheckCircle,
  AlertCircle, XCircle, Save, ChevronDown, FileSearch, Zap, Users, User,
} from "lucide-react";

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: "submitted",   label: "Enviado" },
  { value: "reviewing",   label: "En revisión" },
  { value: "corrections", label: "Con observaciones" },
  { value: "approved",    label: "Aprobado" },
  { value: "certified",   label: "Certificado" },
  { value: "rejected",    label: "Rechazado" },
];

const progressByStatus: Record<ProjectStatus, number> = {
  submitted:   10,
  reviewing:   50,
  corrections: 40,
  approved:    100,
  certified:   100,
  rejected:    100,
};

type EditState = {
  status: ProjectStatus;
  reviewer: string;
  reviewer2: string;
  saving: boolean;
};

type AutoAssignState = {
  numReviewers: 1 | 2;
  mode: "individual" | "group";
  loading: boolean;
  result: string;
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith(name + "="))
      ?.split("=")[1] ?? ""
  );
}

const avatarColors = [
  "bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700", "bg-emerald-100 text-emerald-700",
  "bg-pink-100 text-pink-700", "bg-orange-100 text-orange-700",
];

export default function ReviewerDashboard() {
  const [projects, setProjects]   = useState<Project[]>([]);
  const [loading, setLoading]     = useState(true);
  const [edits, setEdits]         = useState<Record<string, EditState>>({});
  const [savedId, setSavedId]     = useState<string | null>(null);
  const [reviewerName, setReviewerName] = useState("");
  const [myReviews, setMyReviews] = useState<{ project_id: string; round: number }[]>([]);
  const [autoAssign, setAutoAssign] = useState<Record<string, AutoAssignState>>({});
  const router = useRouter();

  const loadProjects = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabase();

    const [{ data: projectData }, { data: reviewData }] = await Promise.all([
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("reviews").select("project_id, round").eq(
        "reviewer_name",
        decodeURIComponent(getCookie("reviewer_name"))
      ),
    ]);

    const list = projectData ?? [];
    setProjects(list);
    setMyReviews(reviewData ?? []);

    const initial: Record<string, EditState> = {};
    const initialAA: Record<string, AutoAssignState> = {};
    list.forEach((p) => {
      initial[p.id] = { status: p.status, reviewer: p.reviewer ?? "", reviewer2: p.reviewer2 ?? "", saving: false };
      initialAA[p.id] = { numReviewers: 2, mode: "individual", loading: false, result: "" };
    });
    setEdits(initial);
    setAutoAssign(initialAA);
    setLoading(false);
  }, []);

  useEffect(() => {
    const name = decodeURIComponent(getCookie("reviewer_name"));
    setReviewerName(name);
    loadProjects();
  }, [loadProjects]);

  function isAssigned(p: Project): boolean {
    const name = reviewerName.toLowerCase().trim();
    return (
      (p.reviewer?.toLowerCase().trim() === name && name !== "") ||
      (p.reviewer2?.toLowerCase().trim() === name && name !== "")
    );
  }

  function hasReviewed(p: Project): boolean {
    return myReviews.some(
      (r) => r.project_id === p.id && r.round === (p.current_round ?? 1)
    );
  }

  async function saveProject(id: string) {
    const edit = edits[id];
    if (!edit) return;
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], saving: true } }));

    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status:    edit.status,
        reviewer:  edit.reviewer  || null,
        reviewer2: edit.reviewer2 || null,
        progress:  progressByStatus[edit.status],
      }),
    });

    setSavedId(id);
    setTimeout(() => setSavedId(null), 2000);
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], saving: false } }));
    loadProjects();
  }

  async function handleAutoAssign(projectId: string) {
    const aa = autoAssign[projectId];
    if (!aa) return;
    setAutoAssign((prev) => ({ ...prev, [projectId]: { ...prev[projectId], loading: true, result: "" } }));
    const res = await fetch(`/api/admin/projects/${projectId}/auto-assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numReviewers: aa.numReviewers, mode: aa.mode }),
    });
    const data = await res.json();
    if (res.ok) {
      const names = data.assigned.map((a: { name: string; fromExpertise: boolean }) =>
        `${a.name}${a.fromExpertise ? " ✓" : " (fallback)"}`
      ).join(", ");
      setAutoAssign((prev) => ({ ...prev, [projectId]: { ...prev[projectId], loading: false, result: `Asignado: ${names}` } }));
      loadProjects();
    } else {
      setAutoAssign((prev) => ({ ...prev, [projectId]: { ...prev[projectId], loading: false, result: `Error: ${data.error}` } }));
    }
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/revisores");
  }

  const stats = [
    { label: "Total",       value: projects.length,                                                       icon: ClipboardList, color: "text-[#1A1A1A]", bg: "bg-slate-100" },
    { label: "Pendientes",  value: projects.filter((p) => p.status === "submitted").length,               icon: Clock,         color: "text-amber-600",  bg: "bg-amber-50"  },
    { label: "En revisión", value: projects.filter((p) => p.status === "reviewing").length,               icon: AlertCircle,   color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Aprobados",   value: projects.filter((p) => p.status === "approved").length,                icon: CheckCircle,   color: "text-emerald-600",bg: "bg-emerald-50"},
    { label: "Rechazados",  value: projects.filter((p) => p.status === "rejected").length,                icon: XCircle,       color: "text-red-500",    bg: "bg-red-50"    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-uai-navy">Panel de Revisores</h1>
            <span className="bg-orange-100 text-[#CC5200] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              Modo Comité
            </span>
          </div>
          {reviewerName && (
            <p className="text-slate-500 text-sm">Sesión: <strong className="text-[#1A1A1A]">{reviewerName}</strong></p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadProjects}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-500 hover:text-red-600 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors hover:border-red-200 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-slate-400 text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">Todos los proyectos</h2>
          <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
            {projects.length} proyectos
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-slate-300" />
            Cargando proyectos...
          </div>
        ) : projects.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 text-slate-200" />
            <p>No hay proyectos enviados aún.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {projects.map((p, i) => {
              const edit = edits[p.id] ?? { status: p.status, reviewer: p.reviewer ?? "", reviewer2: p.reviewer2 ?? "", saving: false };
              const changed =
                edit.status    !== p.status           ||
                edit.reviewer  !== (p.reviewer  ?? "") ||
                edit.reviewer2 !== (p.reviewer2 ?? "");
              const isSaved    = savedId === p.id;
              const assigned   = isAssigned(p);
              const reviewed   = hasReviewed(p);

              return (
                <div key={p.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-5">
                    {/* Project info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${avatarColors[i % avatarColors.length]}`}>
                        {getInitials(p.researcher_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-800 leading-snug mb-1">{p.title}</div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mb-2">
                          <span>{p.researcher_name}</span>
                          <span>·</span>
                          <span>{p.project_type}</span>
                          <span>·</span>
                          <span>{getThemeLabel(p.theme).split(" ").slice(0, 3).join(" ")}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={p.status} />
                          {p.current_round && p.current_round > 1 && (
                            <span className="text-xs bg-violet-50 text-violet-600 font-semibold px-2.5 py-1 rounded-full border border-violet-100">
                              Ronda {p.current_round}
                            </span>
                          )}
                          {/* Review CTA for assigned reviewers */}
                          {assigned && !reviewed && ["submitted", "reviewing", "corrections"].includes(p.status) && (
                            <button
                              onClick={() => router.push(
                                p.review_mode === "group"
                                  ? `/revisores/review/${p.id}/group`
                                  : `/revisores/review/${p.id}`
                              )}
                              className="flex items-center gap-1.5 text-xs bg-[#CC5200] hover:bg-[#B34700] text-white font-bold px-3 py-1.5 rounded-full transition-colors"
                            >
                              <FileSearch className="w-3.5 h-3.5" />
                              {p.review_mode === "group" ? "Revisión grupal" : "Revisar"}
                            </button>
                          )}
                          {p.review_mode === "group" && (
                            <span className="text-xs bg-violet-50 text-violet-600 font-semibold px-2.5 py-1 rounded-full border border-violet-100 flex items-center gap-1">
                              <Users className="w-3 h-3" /> Grupal
                            </span>
                          )}
                          {assigned && reviewed && (
                            <span className="text-xs bg-emerald-50 text-emerald-600 font-semibold px-2.5 py-1 rounded-full border border-emerald-100">
                              ✓ Revisado por ti
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:shrink-0">
                      {/* Status selector */}
                      <div className="relative">
                        <select
                          value={edit.status}
                          onChange={(e) =>
                            setEdits((prev) => ({
                              ...prev,
                              [p.id]: { ...prev[p.id], status: e.target.value as ProjectStatus },
                            }))
                          }
                          className="appearance-none w-full sm:w-48 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 pr-9 cursor-pointer"
                        >
                          {statusOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      {/* Reviewers */}
                      <div className="flex flex-col gap-1.5">
                        <input
                          type="text"
                          value={edit.reviewer}
                          onChange={(e) =>
                            setEdits((prev) => ({
                              ...prev,
                              [p.id]: { ...prev[p.id], reviewer: e.target.value },
                            }))
                          }
                          placeholder="Revisor 1..."
                          className="w-full sm:w-44 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                        />
                        <input
                          type="text"
                          value={edit.reviewer2}
                          onChange={(e) =>
                            setEdits((prev) => ({
                              ...prev,
                              [p.id]: { ...prev[p.id], reviewer2: e.target.value },
                            }))
                          }
                          placeholder="Revisor 2..."
                          className="w-full sm:w-44 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                        />
                      </div>

                      {/* Save button */}
                      <button
                        onClick={() => saveProject(p.id)}
                        disabled={(!changed && !isSaved) || edit.saving}
                        className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          isSaved
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : changed
                            ? "bg-uai-navy text-white hover:bg-uai-navy-dark shadow-sm"
                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        {isSaved ? (
                          <><CheckCircle className="w-4 h-4" /> Guardado</>
                        ) : edit.saving ? (
                          <><RefreshCw className="w-4 h-4 animate-spin" /> Guardando...</>
                        ) : (
                          <><Save className="w-4 h-4" /> Guardar</>
                        )}
                      </button>
                    </div>

                    {/* Auto-assign panel */}
                    {(() => {
                      const aa = autoAssign[p.id];
                      if (!aa) return null;
                      return (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5" /> Auto-asignar
                          </span>
                          <select
                            value={aa.numReviewers}
                            onChange={(e) => setAutoAssign((prev) => ({ ...prev, [p.id]: { ...prev[p.id], numReviewers: Number(e.target.value) as 1 | 2, mode: Number(e.target.value) === 1 ? "individual" : prev[p.id].mode } }))}
                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                          >
                            <option value={1}>1 revisor</option>
                            <option value={2}>2 revisores</option>
                          </select>
                          {aa.numReviewers === 2 && (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => setAutoAssign((prev) => ({ ...prev, [p.id]: { ...prev[p.id], mode: "individual" } }))}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${aa.mode === "individual" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
                              >
                                <User className="w-3 h-3" /> Separado
                              </button>
                              <button
                                onClick={() => setAutoAssign((prev) => ({ ...prev, [p.id]: { ...prev[p.id], mode: "group" } }))}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${aa.mode === "group" ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
                              >
                                <Users className="w-3 h-3" /> Grupal
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => handleAutoAssign(p.id)}
                            disabled={aa.loading}
                            className="flex items-center gap-1.5 bg-[#CC5200] hover:bg-[#B34700] disabled:opacity-50 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors"
                          >
                            {aa.loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                            Asignar
                          </button>
                          {aa.result && (
                            <span className={`text-xs font-medium ${aa.result.startsWith("Error") ? "text-red-500" : "text-emerald-600"}`}>
                              {aa.result}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
