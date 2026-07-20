"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProjectState from "@/components/ProjectState";
import { getThemeLabel } from "@/lib/themes";
import { themes } from "@/lib/themes";
import { getSupabase } from "@/lib/supabase";
import {
  FolderOpen, Plus, RefreshCw, ChevronRight,
  LayoutDashboard, Users, Trash2, AlertTriangle,
} from "lucide-react";

type Project = {
  id: string;
  title: string;
  status: string;
  progress?: number;
  tracking_code: string;
  current_round: number | null;
  created_at: string;
  project_type: string;
  theme: string;
  researcher_name: string;
  researcher_email?: string;
  reviewer: string | null;
  reviewer2: string | null;
  funding_type: string | null;
  funding_folio: string | null;
  certificate_url?: string | null;
};

type UserType = "investigador" | "comite" | "admin" | "none";

const TYPE_LABELS: Record<string, string> = {
  pregrado:  "Pregrado",
  magister:  "Magíster",
  doctorado: "Doctorado",
  docente:   "Docente/Investigador",
  fondecyt:  "Fondecyt",
  externo:   "Externo",
};

const avatarColors = [
  "bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700", "bg-emerald-100 text-emerald-700",
  "bg-pink-100 text-pink-700", "bg-orange-100 text-orange-700",
];

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function ProjectsPage() {
  const [userType, setUserType]   = useState<UserType>("none");
  const [projects, setProjects]   = useState<Project[]>([]);
  const [viewAll, setViewAll]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);

  const [filterSearch,  setFilterSearch]  = useState("");
  const [filterStatus,  setFilterStatus]  = useState("");
  const [filterType,    setFilterType]    = useState("");
  const [filterAssign,  setFilterAssign]  = useState("");
  const [filterFunding, setFilterFunding] = useState("");
  const [filterTheme,   setFilterTheme]   = useState("");

  const router = useRouter();

  const loadProjects = useCallback(async (type: UserType, all: boolean) => {
    setLoading(true);

    if (type === "investigador") {
      const res = await fetch("/api/investigador/projects");
      if (!res.ok) { router.push("/investigador"); return; }
      const data = await res.json();
      setProjects(data.projects ?? []);

    } else if (type === "comite") {
      if (all) {
        const res = await fetch("/api/comite/projects");
        if (res.ok) setProjects((await res.json()).projects ?? []);
      } else {
        const res = await fetch("/api/comite/reviews");
        if (res.ok) {
          const data = await res.json();
          setProjects(data.assignedProjects ?? []);
        }
      }

    } else if (type === "admin") {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("projects")
        .select("id,title,status,project_type,theme,funding_type,funding_folio,researcher_name,researcher_email,reviewer,reviewer2,created_at,tracking_code,current_round,certificate_url")
        .order("created_at", { ascending: false });
      setProjects(data ?? []);
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((me) => {
      const t = me.type;
      const type: UserType =
        t === "admin"       ? "admin" :
        t === "investigador"? "investigador" :
        t === "comite"      ? "comite" : "none";
      setUserType(type);
      if (type === "none") {
        router.push("/investigador");
      } else {
        loadProjects(type, false);
      }
    });
  }, [router, loadProjects]);

  function handleToggle(all: boolean) {
    setViewAll(all);
    loadProjects(userType, all);
  }

  async function handleDeleteProject() {
    if (!confirmDelete) return;
    setDeletingProject(true);
    await fetch(`/api/admin/projects/${confirmDelete.id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== confirmDelete.id));
    setConfirmDelete(null);
    setDeletingProject(false);
  }

  // ── Admin filtered view ──────────────────────────────────────────────────
  if (userType === "admin") {
    if (loading) {
      return (
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-slate-300" />
          <p className="text-slate-400 text-sm">Cargando proyectos...</p>
        </div>
      );
    }

    const filtered = projects.filter(p => {
      if (filterSearch && !p.title.toLowerCase().includes(filterSearch.toLowerCase()) &&
        !p.researcher_name.toLowerCase().includes(filterSearch.toLowerCase())) return false;
      if (filterStatus  && p.status       !== filterStatus)  return false;
      if (filterType    && p.project_type !== filterType)    return false;
      if (filterTheme   && p.theme        !== filterTheme)   return false;
      if (filterFunding === "fondecyt"  && p.funding_type !== "fondecyt")  return false;
      if (filterFunding === "grant_uai" && p.funding_type !== "grant_uai") return false;
      if (filterFunding === "none"      && p.funding_type && p.funding_type !== "none") return false;
      if (filterAssign  === "assigned"   && !p.reviewer)  return false;
      if (filterAssign  === "unassigned" &&  p.reviewer)  return false;
      return true;
    });

    const hasFilters = filterSearch || filterStatus || filterType || filterTheme || filterFunding || filterAssign;

    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-uai-navy mb-1">Proyectos</h1>
            <p className="text-slate-400 text-sm">Todos los proyectos enviados al Comité de Ética</p>
          </div>
          <Link
            href="/coordinador"
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" /> Estadísticas
          </Link>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total",         value: projects.length,                                                                           color: "text-slate-700" },
            { label: "En proceso",    value: projects.filter(p => ["submitted","reviewing","corrections"].includes(p.status)).length,   color: "text-amber-600" },
            { label: "Aprobados",     value: projects.filter(p => p.status === "approved" || p.status === "certified").length,          color: "text-emerald-600" },
            { label: "Sin asignar",   value: projects.filter(p => !p.reviewer).length,                                                  color: "text-orange-500" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
              <div className={`text-4xl font-bold ${s.color} mb-1`}>{s.value}</div>
              <div className="text-slate-400 text-xs font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Header + filters */}
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-1 h-5 rounded-full bg-[#CC5200]" />
                <FolderOpen className="w-4 h-4 text-slate-400" />
                <h2 className="font-bold text-slate-700 text-sm">Todos los proyectos</h2>
              </div>
              <div className="flex items-center gap-2">
                {hasFilters && (
                  <button
                    onClick={() => { setFilterSearch(""); setFilterStatus(""); setFilterType(""); setFilterTheme(""); setFilterFunding(""); setFilterAssign(""); }}
                    className="text-[11px] font-semibold text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                  >
                    Limpiar filtros
                  </button>
                )}
                <span className="text-[11px] text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full font-medium tabular-nums">
                  {filtered.length}{hasFilters ? ` de ${projects.length}` : ""} proyectos
                </span>
                <button onClick={() => loadProjects("admin", false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={filterSearch} onChange={e => setFilterSearch(e.target.value)}
                  placeholder="Buscar título o investigador…"
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-uai-navy/20 w-52"
                />
              </div>

              <select value={filterAssign} onChange={e => setFilterAssign(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-600 focus:outline-none focus:ring-2 focus:ring-uai-navy/20 appearance-none cursor-pointer">
                <option value="">Asignación: Todos</option>
                <option value="assigned">Con revisor asignado</option>
                <option value="unassigned">Sin asignar</option>
              </select>

              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-600 focus:outline-none focus:ring-2 focus:ring-uai-navy/20 appearance-none cursor-pointer">
                <option value="">Estado: Todos</option>
                <option value="submitted">Enviado</option>
                <option value="reviewing">En revisión</option>
                <option value="corrections">Con observaciones</option>
                <option value="approved">Aprobado</option>
                <option value="certified">Certificado</option>
                <option value="rejected">Rechazado</option>
              </select>

              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-600 focus:outline-none focus:ring-2 focus:ring-uai-navy/20 appearance-none cursor-pointer">
                <option value="">Tipo: Todos</option>
                <option value="pregrado">Pregrado</option>
                <option value="magister">Magíster</option>
                <option value="doctorado">Doctorado</option>
                <option value="docente">Docente/Investigador</option>
                <option value="fondecyt">Fondecyt</option>
                <option value="externo">Externo</option>
              </select>

              <select value={filterFunding} onChange={e => setFilterFunding(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-600 focus:outline-none focus:ring-2 focus:ring-uai-navy/20 appearance-none cursor-pointer">
                <option value="">Financiamiento: Todos</option>
                <option value="fondecyt">Fondecyt / ANID</option>
                <option value="grant_uai">Grant UAI</option>
                <option value="none">Sin financiamiento</option>
              </select>

              <select value={filterTheme} onChange={e => setFilterTheme(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-600 focus:outline-none focus:ring-2 focus:ring-uai-navy/20 appearance-none cursor-pointer">
                <option value="">Área: Todas</option>
                {themes.map(t => (
                  <option key={t.id} value={t.id}>{t.short}</option>
                ))}
              </select>
            </div>
          </div>

          {/* List */}
          <div className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <div className="py-14 text-center text-slate-400 text-sm">
                Sin proyectos que coincidan con los filtros seleccionados.
              </div>
            ) : (
              filtered.map((p) => (
                <div key={p.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm leading-snug truncate">{p.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{p.researcher_name}{p.researcher_email ? ` · ${p.researcher_email}` : ""}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <ProjectState status={p.status} certificateUrl={p.certificate_url} />
                      {TYPE_LABELS[p.project_type] && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600">
                          {TYPE_LABELS[p.project_type]}
                        </span>
                      )}
                      {p.theme && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">
                          {getThemeLabel(p.theme)}
                        </span>
                      )}
                      {p.reviewer ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700">
                          ✓ {p.reviewer}{p.reviewer2 ? ` · ${p.reviewer2}` : ""}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-orange-50 text-orange-500">
                          Sin asignar
                        </span>
                      )}
                      {p.funding_type && p.funding_type !== "none" && p.funding_folio && (
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg ${
                          p.funding_type === "fondecyt" ? "bg-amber-100 text-amber-800" : "bg-violet-100 text-violet-800"
                        }`}>
                          {p.funding_type === "fondecyt" ? "Fondecyt" : "Grant"} {p.funding_folio}
                        </span>
                      )}
                      <span className="text-xs text-slate-300">{formatDate(p.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.tracking_code && (
                      <Link
                        href={`/track/${p.tracking_code}`}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#CC5200] transition-colors font-medium"
                      >
                        Ver <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    <button
                      onClick={() => setConfirmDelete(p)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Eliminar proyecto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Confirm delete modal */}
        {confirmDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 max-w-md w-full">
              <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 text-center mb-2">¿Eliminar proyecto?</h2>
              <p className="text-slate-500 text-sm text-center mb-1">Esta acción es <strong>irreversible</strong>.</p>
              <div className="bg-slate-50 rounded-xl px-4 py-3 my-4 text-sm text-slate-700 text-center leading-snug">
                <strong>{confirmDelete.title}</strong><br />
                <span className="text-slate-400 text-xs">{confirmDelete.researcher_name}</span>
              </div>
              <p className="text-xs text-slate-400 text-center mb-6">
                Se eliminarán también todas las revisiones, documentos y borradores asociados.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)} disabled={deletingProject}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-40">
                  Cancelar
                </button>
                <button onClick={handleDeleteProject} disabled={deletingProject}
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                  {deletingProject
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Eliminando...</>
                    : <><Trash2 className="w-4 h-4" /> Sí, eliminar</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Investigador / Comité view ────────────────────────────────────────────

  const stats = [
    { label: "Total",         value: projects.length,                                                              color: "text-slate-700" },
    { label: "En proceso",    value: projects.filter((p) => ["submitted","reviewing","corrections"].includes(p.status)).length, color: "text-amber-600" },
    { label: "Aprobados",     value: projects.filter((p) => p.status === "approved" || p.status === "certified").length, color: "text-emerald-600" },
    { label: "Observaciones", value: projects.filter((p) => p.status === "corrections").length,                    color: "text-orange-500" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-uai-navy mb-1">Proyectos</h1>
          <p className="text-slate-400 text-sm">
            {userType === "investigador" && "Tus proyectos enviados al Comité de Ética"}
            {userType === "comite" && !viewAll && "Proyectos asignados a ti para revisión"}
            {userType === "comite" && viewAll && "Todos los proyectos del Comité de Ética"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {userType === "comite" && (
            <Link
              href="/revisores/dashboard"
              className="flex items-center gap-2 text-slate-500 hover:text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" /> Panel completo
            </Link>
          )}
          {userType === "investigador" && (
            <Link
              href="/submit"
              className="flex items-center gap-2 bg-uai-navy hover:bg-uai-navy-dark text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nuevo proyecto
            </Link>
          )}
        </div>
      </div>

      {/* Toggle — comité only */}
      {userType === "comite" && (
        <div className="flex bg-slate-100 rounded-xl p-1 mb-8 w-fit">
          <button
            onClick={() => handleToggle(false)}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
              !viewAll ? "bg-white text-uai-navy shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <FolderOpen className="w-4 h-4" /> Mis asignados
          </button>
          <button
            onClick={() => handleToggle(true)}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
              viewAll ? "bg-white text-uai-navy shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Users className="w-4 h-4" /> Todos del comité
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
            <div className={`text-4xl font-bold ${s.color} mb-1`}>{s.value}</div>
            <div className="text-slate-400 text-xs font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <FolderOpen className="w-5 h-5 text-slate-400" />
          <h2 className="font-semibold text-slate-700 text-sm">
            {userType === "comite" && viewAll ? "Todos los proyectos" : "Proyectos"}
          </h2>
          <span className="ml-auto text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
            {projects.length} proyecto{projects.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => loadProjects(userType, viewAll)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-slate-300" />
            Cargando proyectos...
          </div>
        ) : projects.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="font-semibold text-slate-600 mb-1">Sin proyectos</h3>
            <p className="text-slate-400 text-sm">
              {userType === "comite" && !viewAll
                ? "No tienes proyectos asignados actualmente."
                : "No hay proyectos enviados aún."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wide">Proyecto</th>
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wide hidden md:table-cell">Temática</th>
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Enviado</th>
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wide">Estado</th>
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Progreso</th>
                  <th className="px-6 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {projects.map((p, i) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${avatarColors[i % avatarColors.length]}`}>
                          {getInitials(p.researcher_name)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 leading-snug max-w-[260px] line-clamp-2">
                            {p.title}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {p.researcher_name} · {p.project_type}
                          </div>
                          {p.funding_type && p.funding_type !== "none" && p.funding_folio && (
                            <span className="text-xs bg-violet-50 text-violet-600 border border-violet-100 px-1.5 py-0.5 rounded font-mono mt-1 inline-block">
                              {p.funding_type === "fondecyt" ? "Fondecyt" : "Grant"} {p.funding_folio}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-medium">
                        {p.theme ? getThemeLabel(p.theme) : "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 hidden lg:table-cell text-xs whitespace-nowrap">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <ProjectState status={p.status} certificateUrl={p.certificate_url} />
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 w-28">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              p.status === "approved"    ? "bg-emerald-500" :
                              p.status === "rejected"    ? "bg-red-400" :
                              p.status === "reviewing"   ? "bg-blue-400" : "bg-amber-400"
                            }`}
                            style={{ width: `${p.progress ?? 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 w-8">{p.progress ?? 0}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/track/${p.tracking_code}`}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#CC5200] transition-colors font-medium"
                      >
                        Ver <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
