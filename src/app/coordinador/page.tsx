"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { getSupabase } from "@/lib/supabase";
import { themes } from "@/lib/themes";
import {
  BarChart2, FolderOpen, CheckCircle, AlertCircle, Clock, XCircle,
  TrendingUp, BookOpen, DollarSign, Upload, Trash2, FileText, RefreshCw,
  HardDrive, AlertTriangle, Activity,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

// ─── Constants ─────────────────────────────────────────────────────────────

const DOC_DEFINITIONS = [
  { id: "protocol",    label: "Protocolo de investigación",          required: true  },
  { id: "consent",     label: "Consentimiento informado",            required: true  },
  { id: "assent",      label: "Asentimiento informado (menores)",    required: false },
  { id: "instruments", label: "Instrumentos / tests a utilizar",     required: false },
];

const ADMIN_EMAIL = "felipe.rojast@uai.cl";

const STATUS_COLORS: Record<string, string> = {
  submitted:   "#f59e0b",
  reviewing:   "#3b82f6",
  corrections: "#f97316",
  approved:    "#22c55e",
  rejected:    "#ef4444",
};
const STATUS_LABELS: Record<string, string> = {
  submitted:   "Enviado",
  reviewing:   "En revisión",
  corrections: "Con observaciones",
  approved:    "Aprobado",
  rejected:    "Rechazado",
};
const TYPE_LABELS: Record<string, string> = {
  pregrado:  "Pregrado",
  magister:  "Magíster",
  doctorado: "Doctorado",
  docente:   "Docente/Investigador",
  fondecyt:  "Fondecyt",
  externo:   "Externo",
};
const FUNDING_COLORS = ["#8b5cf6", "#CC5200", "#94a3b8"];

// ─── Type ──────────────────────────────────────────────────────────────────

type Project = {
  id: string; title: string; status: string; project_type: string;
  theme: string; advisor_name: string | null; funding_type: string | null;
  funding_folio: string | null; researcher_name: string;
  researcher_email: string; created_at: string;
};

function count<T extends string>(arr: T[]): Record<string, number> {
  return arr.reduce((acc, v) => ({ ...acc, [v]: (acc[v] ?? 0) + 1 }), {} as Record<string, number>);
}

// ─── Animations ────────────────────────────────────────────────────────────

function useCountUp(target: number, active: boolean, delay = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - t0) / 1500, 1);
        setVal(Math.round((1 - (1 - p) ** 3) * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(id);
  }, [active, target, delay]);
  return val;
}

function RingGauge({ pct, color, size = 52, sw = 4.5, delay = 0, active }: {
  pct: number; color: string; size?: number; sw?: number; delay?: number; active: boolean;
}) {
  const r = (size - sw) / 2;
  const C = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={sw} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={`${active ? Math.min(pct, 100) / 100 * C : 0} ${C}`}
        style={{ transition: active ? `stroke-dasharray 1.8s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms` : "none" }}
      />
    </svg>
  );
}

// ─── KPI sub-component (needs own hook call) ───────────────────────────────

function KPICard({ value, label, icon: Icon, color, ring, delay, active }: {
  value: number; label: string; icon: React.ElementType;
  color: string; ring: number; delay: number; active: boolean;
}) {
  const displayed = useCountUp(value, active, delay);
  return (
    <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.05] p-4 overflow-hidden group hover:bg-white/[0.09] hover:border-white/[0.15] transition-all duration-300 cursor-default">
      <div
        className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-25 group-hover:opacity-40 transition-opacity pointer-events-none"
        style={{ backgroundColor: color }}
      />
      <div className="flex items-start justify-between mb-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}22`, color }}>
          <Icon className="w-4 h-4" />
        </div>
        <RingGauge pct={ring} color={color} active={active} delay={delay} />
      </div>
      <div className="text-2xl font-bold text-white tabular-nums leading-none mb-1">{displayed}</div>
      <div className="text-[11px] text-white/50 font-medium leading-snug">{label}</div>
    </div>
  );
}

// ─── Chart card wrapper ────────────────────────────────────────────────────

function ChartCard({ title, icon: Icon, accent, children }: {
  title: string; icon?: React.ElementType; accent: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-2.5">
        <span className="w-1 h-5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
        <h2 className="font-bold text-slate-700 text-sm">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Dark custom tooltip ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const n = Number(payload[0]?.value ?? 0);
  return (
    <div className="bg-[#0A1628] text-white text-xs rounded-xl px-3.5 py-2.5 shadow-2xl border border-white/[0.1]">
      {label && <p className="text-white/45 text-[10px] font-semibold uppercase tracking-wide mb-1">{label}</p>}
      <p className="font-bold text-sm tabular-nums">
        {n} <span className="text-white/55 font-normal text-xs">proyecto{n !== 1 ? "s" : ""}</span>
      </p>
    </div>
  );
}

// ─── Pie/Donut custom legend ───────────────────────────────────────────────

function CustomLegend({ payload }: { payload?: { value: string; color: string }[] }) {
  if (!payload) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-2">
      {payload.map((p) => (
        <div key={p.value} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-[11px] text-slate-500 font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────

export default function CoordinadorStats() {
  const router = useRouter();
  const [projects, setProjects]           = useState<Project[]>([]);
  const [loading, setLoading]             = useState(true);
  const [animated, setAnimated]           = useState(false);
  const [templates, setTemplates]         = useState<Record<string, string>>({});
  const [uploading, setUploading]         = useState<string | null>(null);
  const [deleting, setDeleting]           = useState<string | null>(null);
  const [templateMsg, setTemplateMsg]     = useState<{ id: string; ok: boolean; text: string } | null>(null);
  const [syncing, setSyncing]             = useState(false);
  const [syncMsg, setSyncMsg]             = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);

  useEffect(() => {
    if (!loading) {
      const id = setTimeout(() => setAnimated(true), 150);
      return () => clearTimeout(id);
    }
  }, [loading]);

  async function handleSyncAll() {
    setSyncing(true); setSyncMsg(null);
    let ok = 0, fail = 0;
    for (const p of projects) {
      const res = await fetch(`/api/projects/${p.id}/sync-drive`, { method: "POST" });
      if (res.ok) ok++; else fail++;
    }
    setSyncMsg(`✓ ${ok} proyecto${ok !== 1 ? "s" : ""} sincronizado${ok !== 1 ? "s" : ""}${fail > 0 ? ` · ${fail} con error` : ""}`);
    setSyncing(false);
    setTimeout(() => setSyncMsg(null), 5000);
  }

  const loadTemplates = async () => {
    const res = await fetch("/api/admin/templates");
    if (res.ok) setTemplates((await res.json()).files ?? {});
  };

  async function handleTemplateUpload(docId: string, file: File) {
    setUploading(docId); setTemplateMsg(null);
    const fd = new FormData();
    fd.append("file", file); fd.append("docId", docId);
    const res = await fetch("/api/admin/templates", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      setTemplateMsg({ id: docId, ok: true, text: "Subido correctamente" });
      await loadTemplates();
    } else {
      setTemplateMsg({ id: docId, ok: false, text: data.error ?? "Error al subir" });
    }
    setUploading(null);
    setTimeout(() => setTemplateMsg(null), 3000);
  }

  async function handleDeleteProject() {
    if (!confirmDelete) return;
    setDeletingProject(true);
    await fetch(`/api/projects/${confirmDelete.id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== confirmDelete.id));
    setConfirmDelete(null); setDeletingProject(false);
  }

  async function handleTemplateDelete(docId: string) {
    setDeleting(docId);
    await fetch("/api/admin/templates", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId }),
    });
    await loadTemplates(); setDeleting(null);
  }

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(me => {
      if (me.email !== ADMIN_EMAIL) { router.push("/"); return; }
      const supabase = getSupabase();
      supabase
        .from("projects")
        .select("id,title,status,project_type,theme,advisor_name,funding_type,funding_folio,researcher_name,researcher_email,created_at")
        .order("created_at", { ascending: false })
        .then(({ data }) => { setProjects(data ?? []); setLoading(false); });
      loadTemplates();
    });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#040E1C] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-white/10 border-t-[#CC5200] rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  // ── Data ──────────────────────────────────────────────────────────────────
  const total        = projects.length;
  const statusCounts = count(projects.map(p => p.status));
  const statusData   = Object.entries(STATUS_LABELS).map(([key, label]) => ({
    name: label, value: statusCounts[key] ?? 0, color: STATUS_COLORS[key],
  }));

  const typeCounts = count(projects.map(p => p.project_type));
  const typeData   = Object.entries(TYPE_LABELS)
    .map(([key, name]) => ({ name, value: typeCounts[key] ?? 0 }))
    .filter(d => d.value > 0);

  const themeCounts = count(projects.map(p => p.theme).filter(Boolean));
  const themeData   = themes
    .map(t => ({ name: t.emoji + " " + t.label.split(" ").slice(0, 2).join(" "), value: themeCounts[t.id] ?? 0 }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const fundingCounts  = count(projects.map(p => p.funding_type ?? "none"));
  const fundingData    = [
    { name: "Fondecyt",          value: fundingCounts["fondecyt"]  ?? 0 },
    { name: "Grant / Docente",   value: fundingCounts["grant_uai"] ?? 0 },
    { name: "Sin financiamiento", value: fundingCounts["none"]     ?? 0 },
  ].filter(d => d.value > 0);
  const fundedProjects = projects.filter(p => p.funding_type && p.funding_type !== "none");

  const advisorCounts = count(projects.map(p => p.advisor_name).filter((n): n is string => !!n));
  const advisorData   = Object.entries(advisorCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const monthlyMap: Record<string, number> = {};
  projects.forEach(p => {
    const d   = new Date(p.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap[key] = (monthlyMap[key] ?? 0) + 1;
  });
  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      name: new Date(key + "-01").toLocaleDateString("es-CL", { month: "short", year: "2-digit" }),
      value,
    }));

  // ── KPI ring calculation (% of total) ────────────────────────────────────
  const pctOf = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  const statCards = [
    { label: "Total enviados",     value: total,                              icon: Activity,     color: "#60a5fa", ring: 100 },
    { label: "Aprobados",          value: statusCounts["approved"]   ?? 0,    icon: CheckCircle,  color: "#22c55e", ring: pctOf(statusCounts["approved"]   ?? 0) },
    { label: "En revisión",        value: statusCounts["reviewing"]  ?? 0,    icon: Clock,        color: "#3b82f6", ring: pctOf(statusCounts["reviewing"]  ?? 0) },
    { label: "Con observaciones",  value: statusCounts["corrections"]?? 0,    icon: AlertCircle,  color: "#f97316", ring: pctOf(statusCounts["corrections"] ?? 0) },
    { label: "Rechazados",         value: statusCounts["rejected"]   ?? 0,    icon: XCircle,      color: "#ef4444", ring: pctOf(statusCounts["rejected"]   ?? 0) },
    { label: "Con financiamiento", value: fundedProjects.length,              icon: DollarSign,   color: "#c084fc", ring: pctOf(fundedProjects.length) },
  ];

  const axisStyle = { fontSize: 11, fill: "#94a3b8" };

  return (
    <div className="min-h-screen bg-slate-50/60">

      {/* ── Dark animated header ─────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-[#040E1C] via-[#071422] to-[#0C1F35] px-4 pt-12 pb-10 overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-blue-700/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#CC5200]/8 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/4" />
        {/* Dot grid */}
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto">
          {/* Title */}
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-[#CC5200]/20 border border-[#CC5200]/30 flex items-center justify-center shrink-0">
              <BarChart2 className="w-4.5 h-4.5 text-[#CC5200]" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Estadísticas</h1>
            <div className="hidden sm:flex items-center gap-1.5 ml-2 bg-white/[0.06] border border-white/[0.08] px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">En vivo</span>
            </div>
          </div>
          <p className="text-white/35 text-sm ml-12 mb-8 font-medium">
            Panel de análisis · Comité de Ética Escuela de Psicología UAI
          </p>

          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {statCards.map((s, i) => (
              <KPICard
                key={s.label} value={s.value} label={s.label}
                icon={s.icon} color={s.color} ring={s.ring}
                delay={i * 90} active={animated}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Google Drive sync banner */}
        <div className="flex items-center justify-between gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3.5 mb-7">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <HardDrive className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Google Drive · Comité de Ética</p>
              <p className="text-xs text-slate-400">Los proyectos se sincronizan automáticamente. Usa el botón para re-sincronizar todos.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {syncMsg && <span className="text-xs font-semibold text-emerald-600">{syncMsg}</span>}
            <button
              onClick={handleSyncAll}
              disabled={syncing || projects.length === 0}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              {syncing
                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sincronizando...</>
                : <><HardDrive className="w-3.5 h-3.5" /> Sincronizar todos</>}
            </button>
          </div>
        </div>

        {/* ── Charts 2-col grid ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

          {/* Estado de proyectos — donut */}
          <ChartCard title="Estado de proyectos" accent="#CC5200">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <defs>
                  {statusData.map(s => (
                    <radialGradient key={s.name} id={`sg-${s.name}`} cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor={s.color} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={s.color} stopOpacity={1} />
                    </radialGradient>
                  ))}
                </defs>
                <Pie
                  data={statusData.filter(d => d.value > 0)}
                  dataKey="value" nameKey="name"
                  cx="50%" cy="48%" outerRadius={85} innerRadius={50}
                  paddingAngle={3} stroke="none"
                  animationBegin={animated ? 0 : 9999}
                  animationDuration={1400}
                >
                  {statusData.filter(d => d.value > 0).map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
                <Legend content={<CustomLegend />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Tipo de investigación — bars */}
          <ChartCard title="Tipo de investigación" icon={BookOpen} accent="#3b82f6">
            {typeData.length === 0
              ? <p className="text-slate-400 text-sm py-8 text-center">Sin datos aún.</p>
              : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={typeData} layout="vertical" margin={{ left: 8, right: 24, top: 4 }}>
                    <defs>
                      <linearGradient id="barBlue" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.7} />
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <XAxis type="number" allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={140} tick={axisStyle} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(59,130,246,0.06)" }} />
                    <Bar dataKey="value" fill="url(#barBlue)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
          </ChartCard>

          {/* Área temática — bars */}
          <ChartCard title="Área temática" icon={BookOpen} accent="#CC5200">
            {themeData.length === 0
              ? <p className="text-slate-400 text-sm py-8 text-center">Sin datos aún.</p>
              : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={themeData} layout="vertical" margin={{ left: 8, right: 24, top: 4 }}>
                    <defs>
                      <linearGradient id="barOrange" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#CC5200" stopOpacity={0.75} />
                        <stop offset="100%" stopColor="#f97316" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <XAxis type="number" allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={155} tick={axisStyle} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(204,82,0,0.06)" }} />
                    <Bar dataKey="value" fill="url(#barOrange)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
          </ChartCard>

          {/* Financiamiento — donut */}
          <ChartCard title="Financiamiento" icon={DollarSign} accent="#8b5cf6">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={fundingData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={75} innerRadius={42}
                  paddingAngle={3} stroke="none"
                  animationBegin={animated ? 0 : 9999}
                  animationDuration={1400}
                >
                  {fundingData.map((_, i) => (
                    <Cell key={i} fill={FUNDING_COLORS[i % FUNDING_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
                <Legend content={<CustomLegend />} />
              </PieChart>
            </ResponsiveContainer>

            {fundedProjects.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-slate-50 pt-4">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Proyectos con folio</p>
                {fundedProjects.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                    <span className="text-xs text-slate-600 truncate max-w-[55%] font-medium">{p.researcher_name}</span>
                    <span className="text-xs font-mono bg-violet-100 text-violet-700 px-2 py-0.5 rounded-lg font-bold">
                      {p.funding_type === "fondecyt" ? "Fondecyt" : "Grant"} {p.funding_folio}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        </div>

        {/* ── Full-width charts ─────────────────────────────────────────── */}
        {advisorData.length > 0 && (
          <div className="mb-5">
            <ChartCard title="Proyectos por profesor/a guía" icon={TrendingUp} accent="#8b5cf6">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={advisorData} layout="vertical" margin={{ left: 8, right: 24, top: 4 }}>
                  <defs>
                    <linearGradient id="barViolet" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="#c084fc" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <XAxis type="number" allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={185} tick={axisStyle} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(139,92,246,0.06)" }} />
                  <Bar dataKey="value" fill="url(#barViolet)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {monthlyData.length > 1 && (
          <div className="mb-5">
            <ChartCard title="Proyectos enviados por mes" icon={BarChart2} accent="#22c55e">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData} margin={{ left: 0, right: 16, top: 4 }}>
                  <defs>
                    <linearGradient id="barGreen" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#16a34a" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#4ade80" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(34,197,94,0.06)" }} />
                  <Bar dataKey="value" fill="url(#barGreen)" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {/* ── Projects list ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-5">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-1 h-5 rounded-full bg-[#CC5200]" />
              <FolderOpen className="w-4 h-4 text-slate-400" />
              <h2 className="font-bold text-slate-700 text-sm">Todos los proyectos</h2>
            </div>
            <span className="text-[11px] text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full font-medium">
              {projects.length} proyectos
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {projects.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm leading-snug truncate">{p.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{p.researcher_name} · {p.researcher_email}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <StatusBadge status={p.status} />
                    <span className="text-xs text-slate-300">{new Date(p.created_at).toLocaleDateString("es-CL")}</span>
                  </div>
                </div>
                <button
                  onClick={() => setConfirmDelete(p)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                  title="Eliminar proyecto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Template management ───────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2.5 mb-0.5">
                <span className="w-1 h-5 rounded-full bg-[#CC5200]" />
                <Upload className="w-4 h-4 text-slate-400" />
                <h2 className="font-bold text-slate-700 text-sm">Plantillas para investigadores</h2>
              </div>
              <p className="text-xs text-slate-400 ml-8">
                Aparecen en <strong>/documentos</strong> para que los investigadores las descarguen antes de enviar.
              </p>
            </div>
            <button onClick={loadTemplates} className="text-slate-400 hover:text-slate-600 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {DOC_DEFINITIONS.map(doc => {
              const hasFile     = !!templates[doc.id];
              const isUploading = uploading === doc.id;
              const isDeleting  = deleting  === doc.id;
              const msg         = templateMsg?.id === doc.id ? templateMsg : null;

              return (
                <div key={doc.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  hasFile ? "border-emerald-200 bg-emerald-50/40" : "border-slate-100 bg-slate-50/50"
                }`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${hasFile ? "bg-emerald-100" : "bg-slate-100"}`}>
                    <FileText className={`w-4 h-4 ${hasFile ? "text-emerald-600" : "text-slate-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700">
                      {doc.label}
                      {doc.required && <span className="text-red-400 ml-1.5 text-[10px] font-bold bg-red-50 px-1.5 py-0.5 rounded">obligatorio</span>}
                    </p>
                    {hasFile
                      ? <a href={templates[doc.id]} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline">Ver archivo actual</a>
                      : <p className="text-xs text-slate-400">Sin archivo · aparece como "Próximamente"</p>
                    }
                    {msg && (
                      <p className={`text-xs mt-0.5 font-semibold ${msg.ok ? "text-emerald-600" : "text-red-500"}`}>
                        {msg.ok ? "✓" : "✗"} {msg.text}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                      hasFile ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-uai-navy text-white hover:bg-uai-navy-dark"
                    }`}>
                      {isUploading
                        ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Subiendo...</>
                        : <><Upload className="w-3.5 h-3.5" /> {hasFile ? "Reemplazar" : "Subir"}</>}
                      <input type="file" accept=".pdf,.doc,.docx" className="hidden" disabled={isUploading}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleTemplateUpload(doc.id, f); e.target.value = ""; }} />
                    </label>
                    {hasFile && (
                      <button onClick={() => handleTemplateDelete(doc.id)} disabled={isDeleting}
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Eliminar plantilla">
                        {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Confirm delete modal ─────────────────────────────────────────── */}
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
