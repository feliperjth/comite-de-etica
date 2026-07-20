"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield, Users, UserCheck, Mail, ArrowLeft, RefreshCw,
  BookOpen, Search, Tag, Trash2, AlertTriangle, X, KeyRound,
} from "lucide-react";
import ProjectState from "@/components/ProjectState";

const ADMIN_EMAIL = "felipe.rojast@uai.cl";

const TYPE_LABELS: Record<string, string> = {
  pregrado:  "Pregrado",
  magister:  "Magíster",
  doctorado: "Doctorado",
  docente:   "Docente/Investigador",
  fondecyt:  "Fondecyt",
  externo:   "Externo",
};

const THEME_LABELS: Record<string, string> = {
  clinica:        "Clínica y Salud",
  social:         "Social y Comunitaria",
  desarrollo:     "Desarrollo",
  cognitiva:      "Cognitiva",
  neurociencias:  "Neurociencias",
  organizacional: "Organizacional",
  educacional:    "Educacional",
  forense:        "Forense y Jurídica",
  metodologia:    "Metodología",
};

const THEME_COLORS: Record<string, string> = {
  clinica:        "#3b82f6",
  social:         "#10b981",
  desarrollo:     "#f59e0b",
  cognitiva:      "#8b5cf6",
  neurociencias:  "#ec4899",
  organizacional: "#f97316",
  educacional:    "#06b6d4",
  forense:        "#ef4444",
  metodologia:    "#6b7280",
};

type ProjectBrief = {
  id: string; title: string; status: string;
  project_type: string; theme: string; created_at?: string;
  certificate_url?: string | null;
};

type Researcher = {
  id: string; name: string; email: string; created_at: string | null;
  hasAccount: boolean; projects: ProjectBrief[];
};

type Reviewer = {
  id: string; name: string; email: string; expertise: string[];
  created_at: string; assigned: ProjectBrief[]; reviews_submitted: number;
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function AvatarCircle({ name, color }: { name: string; color: string }) {
  return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm text-white select-none"
      style={{ backgroundColor: color }}>
      {initials(name)}
    </div>
  );
}

function ResearcherCard({ r, onDelete }: { r: Researcher; onDelete: () => void }) {
  const [open, setOpen]       = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const colors = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#f97316"];
  const color  = colors[r.name.charCodeAt(0) % colors.length];

  async function handleDelete() {
    setDeleting(true);
    await fetch("/api/admin/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "researcher", email: r.email }),
    });
    onDelete();
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <AvatarCircle name={r.name} color={color} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-slate-800 text-sm leading-tight truncate">{r.name}</p>
              {r.hasAccount
                ? <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full shrink-0">cuenta</span>
                : <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full shrink-0">sin cuenta</span>
              }
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <Mail className="w-3 h-3 shrink-0" />{r.email}
            </p>
          </div>
          <span className="text-[10px] font-bold text-slate-400 tabular-nums shrink-0 bg-slate-50 border border-slate-100 px-2 py-1 rounded-full">
            {r.projects.length} proy.
          </span>
        </div>

        {r.projects.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-3">Sin proyectos enviados</p>
        ) : (
          <>
            <div className="space-y-1.5">
              {(open ? r.projects : r.projects.slice(0, 3)).map(p => (
                <div key={p.id} className="flex items-center gap-2 py-1.5 px-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: THEME_COLORS[p.theme] ?? "#94a3b8" }} />
                  <span className="text-xs text-slate-700 flex-1 truncate">{p.title}</span>
                  <ProjectState status={p.status} certificateUrl={p.certificate_url} />
                </div>
              ))}
            </div>
            {r.projects.length > 3 && (
              <button onClick={() => setOpen(!open)}
                className="mt-2 w-full text-xs text-slate-400 hover:text-slate-600 transition-colors text-center py-1">
                {open ? "Ver menos" : `Ver ${r.projects.length - 3} más`}
              </button>
            )}
          </>
        )}
      </div>

      <div className="px-5 py-3 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          {r.projects.filter(p => p.status === "approved" || p.status === "certified").length} aprobados
          · {r.projects.filter(p => p.status === "reviewing").length} en revisión
        </span>
        {confirm ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-red-600 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> ¿Eliminar?
            </span>
            <button onClick={handleDelete} disabled={deleting}
              className="text-[10px] font-bold bg-red-600 text-white px-2 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50">
              {deleting ? "..." : "Sí"}
            </button>
            <button onClick={() => setConfirm(false)}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-1.5 py-1 rounded-lg border border-slate-200">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirm(true)}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-600 transition-colors font-semibold">
            <Trash2 className="w-3 h-3" /> Eliminar
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewerCard({ r, onDelete }: { r: Reviewer; onDelete: () => void }) {
  const [open, setOpen]       = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const colors = ["#7c3aed","#0891b2","#d97706","#16a34a","#dc2626"];
  const color  = colors[r.name.charCodeAt(0) % colors.length];

  async function handleDelete() {
    setDeleting(true);
    await fetch("/api/admin/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "reviewer", email: r.email }),
    });
    onDelete();
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <AvatarCircle name={r.name} color={color} />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 text-sm leading-tight truncate">{r.name}</p>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <Mail className="w-3 h-3 shrink-0" />{r.email}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-black tabular-nums" style={{ color }}>{r.assigned.length}</div>
            <div className="text-[10px] text-slate-400">asig.</div>
          </div>
        </div>

        {/* Expertise tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {r.expertise.map(e => (
            <span key={e} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${THEME_COLORS[e] ?? "#94a3b8"}15`, color: THEME_COLORS[e] ?? "#94a3b8" }}>
              {THEME_LABELS[e] ?? e}
            </span>
          ))}
        </div>

        {r.assigned.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-2">Sin proyectos asignados</p>
        ) : (
          <>
            <div className="space-y-1.5">
              {(open ? r.assigned : r.assigned.slice(0, 3)).map(p => (
                <div key={p.id} className="flex items-center gap-2 py-1.5 px-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: THEME_COLORS[p.theme] ?? "#94a3b8" }} />
                  <span className="text-xs text-slate-700 flex-1 truncate">{p.title}</span>
                  <ProjectState status={p.status} certificateUrl={p.certificate_url} />
                </div>
              ))}
            </div>
            {r.assigned.length > 3 && (
              <button onClick={() => setOpen(!open)}
                className="mt-2 w-full text-xs text-slate-400 hover:text-slate-600 transition-colors text-center py-1">
                {open ? "Ver menos" : `Ver ${r.assigned.length - 3} más`}
              </button>
            )}
          </>
        )}
      </div>

      <div className="px-5 py-3 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          {r.reviews_submitted} revisión{r.reviews_submitted !== 1 ? "es" : ""} entregada{r.reviews_submitted !== 1 ? "s" : ""}
          · {r.assigned.filter(p => p.status === "reviewing").length} activos
        </span>
        {confirm ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-red-600 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> ¿Eliminar?
            </span>
            <button onClick={handleDelete} disabled={deleting}
              className="text-[10px] font-bold bg-red-600 text-white px-2 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50">
              {deleting ? "..." : "Sí"}
            </button>
            <button onClick={() => setConfirm(false)}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-1.5 py-1 rounded-lg border border-slate-200">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirm(true)}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-600 transition-colors font-semibold">
            <Trash2 className="w-3 h-3" /> Eliminar
          </button>
        )}
      </div>
    </div>
  );
}

export default function MiembrosPage() {
  const router = useRouter();
  const [tab, setTab]           = useState<"researchers" | "reviewers">("researchers");
  const [data, setData]         = useState<{ researchers: Researcher[]; reviewers: Reviewer[] } | null>(null);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filterTheme, setFilterTheme] = useState("");
  const [filterAccount, setFilterAccount] = useState<"" | "with" | "without">("");

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(me => {
      if (me.email !== ADMIN_EMAIL) { router.push("/"); return; }
      fetch("/api/admin/members")
        .then(r => r.json())
        .then(d => { setData(d); setLoading(false); });
    });
  }, [router]);

  const reload = () => {
    setLoading(true);
    fetch("/api/admin/members").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  };

  const withAccountCount = (data?.researchers ?? []).filter(r => r.hasAccount).length;

  const researchers = (data?.researchers ?? []).filter(r =>
    (!search || r.name.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase())) &&
    (!filterTheme || r.projects.some(p => p.theme === filterTheme)) &&
    (!filterAccount || (filterAccount === "with" ? r.hasAccount : !r.hasAccount))
  );

  const reviewers = (data?.reviewers ?? []).filter(r =>
    (!search || r.name.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase())) &&
    (!filterTheme || r.expertise.includes(filterTheme))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#CC5200] rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Cargando miembros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70">

      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 pt-7 pb-8">
        <div className="max-w-7xl mx-auto">
          <button onClick={() => router.push("/coordinador")}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver al panel de estadísticas
          </button>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Acceso restringido</p>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Permisos de Coordinador</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-1.5 bg-violet-50 border border-violet-100 px-3 py-1.5 rounded-full">
                <Shield className="w-3 h-3 text-violet-500" />
                <span className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">Solo coordinador</span>
              </div>
              <button onClick={reload}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-slate-400 text-sm ml-[52px] mt-0.5">
            Gestión de investigadores registrados y revisores del comité · {ADMIN_EMAIL}
          </p>

          {/* Stats row */}
          <div className="flex gap-4 mt-5 ml-[52px]">
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="font-bold text-slate-700">{data?.researchers.length ?? 0}</span>
              <span className="text-slate-400">investigadores</span>
            </div>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-2 text-sm">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-slate-700">{withAccountCount}</span>
              <span className="text-slate-400">con cuenta</span>
            </div>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-2 text-sm">
              <UserCheck className="w-4 h-4 text-violet-400" />
              <span className="font-bold text-slate-700">{data?.reviewers.length ?? 0}</span>
              <span className="text-slate-400">revisores</span>
            </div>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-2 text-sm">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-700">
                {data?.researchers.reduce((s, r) => s + r.projects.length, 0) ?? 0}
              </span>
              <span className="text-slate-400">proyectos totales</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">

        {/* Tabs + filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {/* Tab buttons */}
          <div className="flex bg-white border border-slate-100 rounded-xl p-1 shadow-sm gap-1">
            <button onClick={() => setTab("researchers")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === "researchers"
                  ? "bg-uai-navy text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}>
              <Users className="w-4 h-4" />
              Investigadores
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                tab === "researchers" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
              }`}>{data?.researchers.length ?? 0}</span>
            </button>
            <button onClick={() => setTab("reviewers")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === "reviewers"
                  ? "bg-uai-navy text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}>
              <UserCheck className="w-4 h-4" />
              Revisores
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                tab === "reviewers" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
              }`}>{data?.reviewers.length ?? 0}</span>
            </button>
          </div>

          {/* Search + filter */}
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o email…"
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-100 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-uai-navy/20 shadow-sm"
              />
            </div>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <select
                value={filterTheme}
                onChange={e => setFilterTheme(e.target.value)}
                className="pl-8 pr-3 py-2 bg-white border border-slate-100 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-uai-navy/20 shadow-sm appearance-none">
                <option value="">Todas las áreas</option>
                {Object.entries(THEME_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {tab === "researchers" && (
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <select
                  value={filterAccount}
                  onChange={e => setFilterAccount(e.target.value as "" | "with" | "without")}
                  className="pl-8 pr-3 py-2 bg-white border border-slate-100 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-uai-navy/20 shadow-sm appearance-none">
                  <option value="">Todos</option>
                  <option value="with">Con cuenta</option>
                  <option value="without">Sin cuenta</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Content grid */}
        {tab === "researchers" && (
          <>
            {researchers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">
                  {search || filterTheme ? "Sin resultados para esa búsqueda" : "No hay investigadores registrados aún"}
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {researchers.map(r => <ResearcherCard key={r.id} r={r} onDelete={reload} />)}
              </div>
            )}
          </>
        )}

        {tab === "reviewers" && (
          <>
            {reviewers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">
                  {search || filterTheme ? "Sin resultados para esa búsqueda" : "No hay revisores registrados aún"}
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {reviewers.map(r => <ReviewerCard key={r.id} r={r} onDelete={reload} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
