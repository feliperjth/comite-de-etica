"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { getThemeLabel } from "@/lib/themes";
import {
  FolderOpen, Plus, RefreshCw, ChevronRight,
  LayoutDashboard, Users, Trash2,
} from "lucide-react";

type Project = {
  id: string;
  title: string;
  status: string;
  progress: number;
  tracking_code: string;
  current_round: number | null;
  created_at: string;
  project_type: string;
  theme: string;
  researcher_name: string;
  reviewer: string | null;
  reviewer2: string | null;
  funding_type: string | null;
  funding_folio: string | null;
};

type UserType = "investigador" | "comite" | "none";

const ADMIN_EMAIL = "felipe.rojast@uai.cl";

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
  const [userEmail, setUserEmail] = useState("");
  const [projects, setProjects]   = useState<Project[]>([]);
  const [viewAll, setViewAll]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const router = useRouter();

  const isAdmin = userEmail === ADMIN_EMAIL;

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
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((me) => {
      const type: UserType = me.type ?? "none";
      setUserType(type);
      setUserEmail(me.email ?? "");
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

  async function handleDelete(id: string, title: string) {
    if (!confirm(`¿Eliminar el proyecto "${title}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/projects/${id}`, { method: "DELETE" });
    setDeleting(null);
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } else {
      alert("Error al eliminar el proyecto.");
    }
  }

  const stats = [
    { label: "Total",         value: projects.length,                                                              color: "text-slate-700" },
    { label: "En proceso",    value: projects.filter((p) => ["submitted","reviewing","corrections"].includes(p.status)).length, color: "text-amber-600" },
    { label: "Aprobados",     value: projects.filter((p) => p.status === "approved").length,                       color: "text-emerald-600" },
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
                        {p.theme ? getThemeLabel(p.theme).split(" ").slice(0, 2).join(" ") : "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 hidden lg:table-cell text-xs whitespace-nowrap">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={p.status} />
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
                            style={{ width: `${p.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 w-8">{p.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/track/${p.tracking_code}`}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#CC5200] transition-colors font-medium"
                        >
                          Ver <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(p.id, p.title)}
                            disabled={deleting === p.id}
                            className="text-slate-300 hover:text-red-500 transition-colors disabled:opacity-40"
                            title="Eliminar proyecto"
                          >
                            {deleting === p.id
                              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />
                            }
                          </button>
                        )}
                      </div>
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
