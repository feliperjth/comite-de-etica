"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogOut, RefreshCw, ClipboardList, CheckCircle,
  AlertCircle, FileSearch, LayoutDashboard, BookOpen,
  ChevronRight, Users,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { themes } from "@/lib/themes";

type Review = {
  id: string;
  project_id: string;
  round: number;
  overall_decision: "accepted" | "corrections";
  submitted_at: string;
};

type ProjectInfo = {
  id: string;
  title: string;
  status: string;
  tracking_code: string;
  researcher_name: string;
  current_round: number | null;
  reviewer: string | null;
  reviewer2: string | null;
  progress: number;
};

export default function ComitePerfil() {
  const [reviews, setReviews]                   = useState<Review[]>([]);
  const [projects, setProjects]                 = useState<ProjectInfo[]>([]);
  const [assignedProjects, setAssignedProjects] = useState<ProjectInfo[]>([]);
  const [name, setName]                         = useState("");
  const [email, setEmail]                       = useState("");
  const [isAdmin, setIsAdmin]                   = useState(false);
  const [loading, setLoading]                   = useState(true);
  const [ready, setReady]                       = useState(false);

  const [expertise, setExpertise]               = useState<string[]>([]);
  const [expertiseName, setExpertiseName]       = useState("");
  const [savingExpertise, setSavingExpertise]   = useState(false);
  const [expertiseMsg, setExpertiseMsg]         = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const router = useRouter();

  const loadData = useCallback(async () => {
    setLoading(true);

    // Auth check: accept comite or admin
    const me = await fetch("/api/me").then(r => r.json());
    if (me.type !== "comite" && me.type !== "admin") {
      router.push("/revisores");
      setLoading(false);
      return;
    }
    setIsAdmin(me.type === "admin");

    let reviewerEmail = me.email ?? "";
    let reviewerName  = me.name  ?? "";

    const res = await fetch("/api/comite/reviews");
    if (res.ok) {
      const data = await res.json();
      setReviews(data.reviews ?? []);
      setProjects(data.projects ?? []);
      setAssignedProjects(data.assignedProjects ?? []);
      reviewerEmail = data.email ?? me.email ?? "";
      reviewerName  = data.name  ?? me.name  ?? "";
    }
    setName(reviewerName);
    setEmail(reviewerEmail);
    setReady(true);

    // Load existing expertise from reviewers table
    const rvRes = await fetch("/api/reviewers");
    if (rvRes.ok) {
      const allReviewers: { email: string; name: string; expertise: string[] }[] = await rvRes.json();
      const mine = allReviewers.find((r) => r.email === reviewerEmail);
      if (mine) {
        if (mine.expertise?.length) setExpertise(mine.expertise);
        if (mine.name) setExpertiseName(mine.name);
      }
      if (!mine?.name && reviewerName) setExpertiseName(reviewerName);
    }

    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleLogout() {
    await fetch("/api/comite/auth", { method: "DELETE" });
    await fetch("/api/auth",        { method: "DELETE" });
    router.push("/revisores");
    router.refresh();
  }

  function toggleExpertise(id: string) {
    setExpertise((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
    setExpertiseMsg(null);
  }

  async function handleSaveExpertise() {
    if (expertise.length !== 3) {
      setExpertiseMsg({ type: "err", text: "Selecciona exactamente 3 áreas." });
      return;
    }
    setSavingExpertise(true);
    setExpertiseMsg(null);
    const res = await fetch("/api/reviewers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: expertiseName.trim(), email, expertise }),
    });
    if (res.ok) {
      setExpertiseMsg({ type: "ok", text: "Áreas guardadas correctamente." });
    } else {
      const d = await res.json();
      setExpertiseMsg({ type: "err", text: d.error ?? "Error al guardar." });
    }
    setSavingExpertise(false);
  }

  function getProject(projectId: string): ProjectInfo | undefined {
    return projects.find((p) => p.id === projectId);
  }

  const accepted    = reviews.filter((r) => r.overall_decision === "accepted").length;
  const corrections = reviews.filter((r) => r.overall_decision === "corrections").length;

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-uai-navy">Mi perfil</h1>
            {isAdmin ? (
              <span className="bg-[#CC5200]/10 text-[#CC5200] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                Coordinador
              </span>
            ) : (
              <span className="bg-orange-100 text-[#CC5200] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                Comité
              </span>
            )}
          </div>
          {(name || email) && (
            <p className="text-slate-500 text-sm">
              {name && <strong className="text-slate-700">{name} · </strong>}{email}
            </p>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-slate-500 hover:text-red-600 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium hover:border-red-200 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Salir
        </button>
      </div>

      {/* Panel de revisión — prominente, siempre visible */}
      <Link
        href="/revisores/dashboard"
        className="group flex items-center justify-between gap-4 bg-gradient-to-r from-[#CC5200]/10 to-orange-50 border-2 border-[#CC5200]/20 hover:border-[#CC5200]/50 rounded-2xl px-6 py-5 mb-6 hover:shadow-md transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#CC5200] rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-base leading-tight">Panel de revisión de proyectos</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {assignedProjects.length > 0
                ? `${assignedProjects.length} proyecto${assignedProjects.length !== 1 ? "s" : ""} asignado${assignedProjects.length !== 1 ? "s" : ""} · ver todos los proyectos`
                : "Ver todos los proyectos del sistema"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {assignedProjects.filter(p => !reviews.some(r => r.project_id === p.id)).length > 0 && (
            <span className="bg-[#CC5200] text-white text-xs font-bold px-3 py-1.5 rounded-full">
              {assignedProjects.filter(p => !reviews.some(r => r.project_id === p.id)).length} pendiente{assignedProjects.filter(p => !reviews.some(r => r.project_id === p.id)).length !== 1 ? "s" : ""}
            </span>
          )}
          <ChevronRight className="w-6 h-6 text-[#CC5200]/40 group-hover:text-[#CC5200] transition-colors" />
        </div>
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
            <ClipboardList className="w-5 h-5 text-slate-700" />
          </div>
          <div className="text-3xl font-bold text-slate-700">{reviews.length}</div>
          <div className="text-slate-400 text-xs mt-0.5">Revisiones totales</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center mb-3">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-bold text-emerald-600">{accepted}</div>
          <div className="text-slate-400 text-xs mt-0.5">Aceptados</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-3xl font-bold text-amber-600">{corrections}</div>
          <div className="text-slate-400 text-xs mt-0.5">Con correcciones</div>
        </div>
      </div>

      {/* Coordinator: default attributes panel */}
      {isAdmin ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-[#CC5200]" />
            <h2 className="font-semibold text-slate-700">Atributos del coordinador</h2>
            <span className="text-xs text-slate-400 ml-auto bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-full">Por defecto</span>
          </div>
          <div className="p-6">
            <p className="text-xs text-slate-400 mb-4">El coordinador tiene acceso global al sistema. Estas capacidades vienen asignadas por defecto con la cuenta.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Acceso a todos los proyectos",        icon: "📁", desc: "Ve y gestiona cualquier proyecto sin restricción" },
                { label: "Asignación de revisores",             icon: "👥", desc: "Asigna y reasigna revisores a cualquier proyecto" },
                { label: "Eliminar proyectos",                  icon: "🗑️", desc: "Puede eliminar proyectos del sistema" },
                { label: "Panel de estadísticas",               icon: "📊", desc: "Acceso completo al panel de métricas y reportes" },
                { label: "Gestión de plantillas",               icon: "📄", desc: "Sube y administra las plantillas oficiales" },
                { label: "Permisos de coordinador",             icon: "🔐", desc: "Acceso a perfiles de revisores e investigadores" },
                { label: "Todas las áreas temáticas",           icon: "🧠", desc: "Supervisión de proyectos de cualquier área" },
                { label: "Control de estados del proceso",      icon: "⚙️", desc: "Cambia el estado de cualquier proyecto manualmente" },
              ].map((a) => (
                <div key={a.label} className="flex items-start gap-3 p-4 rounded-2xl border border-emerald-100 bg-emerald-50/40">
                  <span className="text-lg shrink-0 mt-0.5">{a.icon}</span>
                  <div>
                    <div className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                      {a.label}
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{a.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
      /* Reviewer: expertise selection */
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-[#CC5200]" />
          <h2 className="font-semibold text-slate-700">Áreas de experticia</h2>
          <span className="text-xs text-slate-400">Selecciona exactamente 3</span>
          <div className="ml-auto flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`w-6 h-1.5 rounded-full ${i < expertise.length ? "bg-[#CC5200]" : "bg-slate-200"}`} />
            ))}
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {themes.map((t) => {
              const selected = expertise.includes(t.id);
              const disabled = !selected && expertise.length >= 3;
              return (
                <button key={t.id} onClick={() => toggleExpertise(t.id)} disabled={disabled}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                    selected ? "border-[#CC5200] bg-orange-50"
                    : disabled ? "border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}>
                  <span className="text-xl shrink-0">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 text-sm">{t.label}</div>
                    <div className="text-xs text-slate-400 truncate">{t.desc}</div>
                  </div>
                  {selected && <CheckCircle className="w-4 h-4 text-[#CC5200] shrink-0" />}
                </button>
              );
            })}
          </div>
          {expertiseMsg && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm text-center font-medium ${
              expertiseMsg.type === "ok"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-red-50 border border-red-200 text-red-600"
            }`}>
              {expertiseMsg.text}
            </div>
          )}
          <button onClick={handleSaveExpertise} disabled={expertise.length !== 3 || savingExpertise}
            className="w-full bg-[#1A1A1A] hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors text-sm">
            {savingExpertise ? "Guardando..." : "Guardar áreas"}
          </button>
        </div>
      </div>
      )}

      {/* Assigned projects pending review */}
      {assignedProjects.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700">Proyectos asignados · pendientes</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {assignedProjects.map((p) => {
              const alreadyReviewed = reviews.some(
                (r) => r.project_id === p.id && r.round === (p.current_round ?? 1)
              );
              return (
                <div key={p.id} className="p-6 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-1 leading-snug">{p.title}</h3>
                    <p className="text-xs text-slate-400 mb-2">{p.researcher_name}</p>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={p.status} />
                      {p.current_round && p.current_round > 1 && (
                        <span className="text-xs bg-violet-50 text-violet-600 font-semibold px-2.5 py-1 rounded-full border border-violet-100">
                          Ronda {p.current_round}
                        </span>
                      )}
                    </div>
                  </div>
                  {alreadyReviewed ? (
                    <span className="text-xs bg-emerald-50 text-emerald-600 font-semibold px-3 py-1.5 rounded-full border border-emerald-100 shrink-0">
                      ✓ Ya revisado
                    </span>
                  ) : (
                    <Link
                      href={`/revisores/review/${p.id}`}
                      className="flex items-center gap-1.5 text-xs bg-[#CC5200] hover:bg-[#B34700] text-white font-bold px-4 py-2 rounded-full transition-colors shrink-0"
                    >
                      <FileSearch className="w-3.5 h-3.5" /> Revisar
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Review history */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">Historial de revisiones</h2>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-slate-300" />
            Cargando...
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 text-slate-200" />
            <p>Aún no has enviado revisiones.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {reviews.map((r) => {
              const proj = getProject(r.project_id);
              return (
                <div key={r.id} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 mb-1 leading-snug">
                        {proj?.title ?? "Proyecto"}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mb-2">
                        <span>{proj?.researcher_name}</span>
                        <span>·</span>
                        <span>Ronda {r.round}</span>
                        <span>·</span>
                        <span>{new Date(r.submitted_at).toLocaleDateString("es-CL")}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {r.overall_decision === "accepted" ? (
                          <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 font-semibold px-3 py-1.5 rounded-full border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5" /> Aceptado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 font-semibold px-3 py-1.5 rounded-full border border-amber-200">
                            <AlertCircle className="w-3.5 h-3.5" /> Con correcciones
                          </span>
                        )}
                        {proj && <StatusBadge status={proj.status} />}
                      </div>
                    </div>
                    {proj && (
                      <Link
                        href={`/track/${proj.tracking_code}`}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 border border-slate-200 px-3 py-2 rounded-xl transition-colors shrink-0"
                      >
                        <FileSearch className="w-3.5 h-3.5" /> Ver proyecto
                      </Link>
                    )}
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
