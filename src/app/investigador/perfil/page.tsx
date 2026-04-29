"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogOut, RefreshCw, ClipboardList, CheckCircle,
  AlertCircle, FileSearch, PlusCircle,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { getThemeLabel } from "@/lib/themes";

type ProjectSummary = {
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
  advisor_name: string | null;
  funding_type: string | null;
  funding_folio: string | null;
  funding_detail: string | null;
};

export default function InvestigadorPerfil() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [email, setEmail]       = useState("");
  const [loading, setLoading]   = useState(true);
  const router = useRouter();

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/investigador/projects");
    if (!res.ok) {
      router.push("/investigador");
      return;
    }
    const data = await res.json();
    setProjects(data.projects ?? []);
    setEmail(data.email ?? "");
    setLoading(false);
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleLogout() {
    await fetch("/api/investigador/auth", { method: "DELETE" });
    router.push("/investigador");
  }

  const stats = [
    {
      label: "Total enviados",
      value: projects.length,
      icon: ClipboardList,
      color: "text-slate-700",
      bg: "bg-slate-100",
    },
    {
      label: "En revisión",
      value: projects.filter((p) => p.status === "reviewing" || p.status === "submitted").length,
      icon: RefreshCw,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "Aprobados",
      value: projects.filter((p) => p.status === "approved").length,
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Con observaciones",
      value: projects.filter((p) => p.status === "corrections").length,
      icon: AlertCircle,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold text-uai-navy mb-1">Mis proyectos</h1>
          {email && <p className="text-slate-400 text-sm">{email}</p>}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-500 hover:text-red-600 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium hover:border-red-200 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
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

      {/* Projects list */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">Historial de proyectos</h2>
          <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
            {projects.length} proyecto{projects.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-slate-300" />
            Cargando...
          </div>
        ) : projects.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 text-slate-200" />
            <p>No hay proyectos enviados con este correo.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {projects.map((p) => (
              <div key={p.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 mb-1 leading-snug">{p.title}</h3>
                    {p.funding_type && p.funding_type !== "none" && (
                      <div className="inline-flex items-center gap-1.5 bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold px-2.5 py-1 rounded-full mb-2">
                        <span>{p.funding_type === "fondecyt" ? "📋 Fondecyt" : "🏛️ Grant UAI"}</span>
                        {p.funding_folio && (
                          <span className="bg-violet-200 text-violet-800 px-1.5 py-0.5 rounded font-mono">
                            Folio {p.funding_folio}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mb-2">
                      <span>{p.project_type}</span>
                      {p.advisor_name && <><span>·</span><span>Guía: <span className="font-medium text-slate-600">{p.advisor_name}</span></span></>}
                      <span>·</span>
                      <span>{getThemeLabel(p.theme).split(" ").slice(0, 3).join(" ")}</span>
                      <span>·</span>
                      <span>{new Date(p.created_at).toLocaleDateString("es-CL")}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={p.status} />
                      {p.current_round && p.current_round > 1 && (
                        <span className="text-xs bg-violet-50 text-violet-600 font-semibold px-2.5 py-1 rounded-full border border-violet-100">
                          Ronda {p.current_round}
                        </span>
                      )}
                      {/* Reviewer assignment badges — no names shown */}
                      {p.reviewer ? (
                        <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full border border-emerald-200">
                          ● Revisor 1
                        </span>
                      ) : (
                        <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2.5 py-1 rounded-full border border-amber-200">
                          ● Sin revisor 1
                        </span>
                      )}
                      {p.reviewer2 ? (
                        <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full border border-emerald-200">
                          ● Revisor 2
                        </span>
                      ) : (
                        <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2.5 py-1 rounded-full border border-amber-200">
                          ● Sin revisor 2
                        </span>
                      )}
                      <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                        {p.tracking_code}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/track/${p.tracking_code}`}
                    className="flex items-center gap-1.5 text-xs bg-uai-navy hover:bg-uai-navy-dark text-white font-semibold px-4 py-2 rounded-xl transition-colors shrink-0"
                  >
                    <FileSearch className="w-3.5 h-3.5" /> Ver seguimiento
                  </Link>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>Progreso</span>
                    <span>{p.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        p.status === "approved"    ? "bg-emerald-400" :
                        p.status === "corrections" ? "bg-amber-400"   :
                        "bg-blue-400"
                      }`}
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/submit"
          className="inline-flex items-center gap-2 text-sm text-[#CC5200] hover:underline font-medium"
        >
          <PlusCircle className="w-4 h-4" /> Enviar nuevo proyecto
        </Link>
      </div>
    </div>
  );
}
