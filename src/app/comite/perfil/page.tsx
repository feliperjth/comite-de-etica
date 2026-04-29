"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogOut, RefreshCw, ClipboardList, CheckCircle,
  AlertCircle, FileSearch, LayoutDashboard,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

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
  const [reviews, setReviews]                 = useState<Review[]>([]);
  const [projects, setProjects]               = useState<ProjectInfo[]>([]);
  const [assignedProjects, setAssignedProjects] = useState<ProjectInfo[]>([]);
  const [name, setName]                       = useState("");
  const [email, setEmail]                     = useState("");
  const [loading, setLoading]                 = useState(true);
  const router = useRouter();

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/comite/reviews");
    if (!res.ok) {
      router.push("/comite");
      return;
    }
    const data = await res.json();
    setReviews(data.reviews ?? []);
    setProjects(data.projects ?? []);
    setAssignedProjects(data.assignedProjects ?? []);
    setName(data.name ?? "");
    setEmail(data.email ?? "");
    setLoading(false);
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleLogout() {
    await fetch("/api/comite/auth", { method: "DELETE" });
    router.push("/comite");
  }

  function getProject(projectId: string): ProjectInfo | undefined {
    return projects.find((p) => p.id === projectId);
  }

  const accepted    = reviews.filter((r) => r.overall_decision === "accepted").length;
  const corrections = reviews.filter((r) => r.overall_decision === "corrections").length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-uai-navy">Mi perfil</h1>
            <span className="bg-orange-100 text-[#CC5200] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              Comité
            </span>
          </div>
          {name && (
            <p className="text-slate-500 text-sm">
              <strong className="text-slate-700">{name}</strong> · {email}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/revisores/dashboard"
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" /> Panel completo
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-500 hover:text-red-600 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium hover:border-red-200 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
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
