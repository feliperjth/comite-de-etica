"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { getSupabase } from "@/lib/supabase";
import { themes } from "@/lib/themes";
import {
  BarChart2, FolderOpen, CheckCircle, AlertCircle, Clock, XCircle,
  TrendingUp, BookOpen, DollarSign, Upload, Trash2, FileText, RefreshCw,
  HardDrive, Activity, Layers, Calendar, Users2, Zap, Shield, ChevronRight,
} from "lucide-react";
import Link from "next/link";

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

// ─── Type ──────────────────────────────────────────────────────────────────

type Project = {
  id: string; title: string; status: string; project_type: string;
  theme: string; advisor_name: string | null; funding_type: string | null;
  funding_folio: string | null; researcher_name: string;
  researcher_email: string; created_at: string;
  reviewer: string | null; reviewer2: string | null;
};

function count<T extends string>(arr: T[]): Record<string, number> {
  return arr.reduce((acc, v) => ({ ...acc, [v]: (acc[v] ?? 0) + 1 }), {} as Record<string, number>);
}

// ─── Animations ────────────────────────────────────────────────────────────

function useCountUp(target: number, active: boolean, delay = 0, duration = 1500) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - t0) / duration, 1);
        setVal(Math.round((1 - (1 - p) ** 3) * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(id);
  }, [active, target, delay, duration]);
  return val;
}

// ─── KPI stat card ─────────────────────────────────────────────────────────

function StatCard({ value, label, icon: Icon, color, pct, delay, active }: {
  value: number; label: string; icon: React.ElementType;
  color: string; pct: number; delay: number; active: boolean;
}) {
  const displayed = useCountUp(value, active, delay);
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-xs font-bold tabular-nums" style={{ color: `${color}99` }}>{pct}%</span>
      </div>
      <div className="text-3xl font-bold text-slate-800 tabular-nums leading-none mb-1">{displayed}</div>
      <div className="text-xs text-slate-400 mb-3 leading-snug">{label}</div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000"
          style={{
            width: active ? `${pct > 0 ? Math.max(pct, 4) : 0}%` : "0%",
            backgroundColor: color,
            transitionDelay: `${delay}ms`,
          }} />
      </div>
    </div>
  );
}

// ─── Approval rate card ────────────────────────────────────────────────────

function ApprovalRateCard({ approvalPct, approved, total, active }: {
  approvalPct: number; approved: number; total: number; active: boolean;
}) {
  const pct = useCountUp(approvalPct, active, 0, 1800);
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-100 rounded-2xl p-5 flex flex-col justify-center h-full">
      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2">Tasa de aprobación</p>
      <div className="text-4xl font-black text-emerald-700 tabular-nums leading-none mb-1">{pct}%</div>
      <div className="text-xs text-emerald-500 mb-3">{approved} aprobados de {total}</div>
      <div className="h-1.5 bg-emerald-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-emerald-500 transition-all duration-[1800ms]"
          style={{ width: active ? `${approvalPct}%` : "0%" }} />
      </div>
    </div>
  );
}

// ─── Pipeline ──────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { key: "submitted",   label: "Enviados",      color: "#f59e0b" },
  { key: "reviewing",   label: "En revisión",   color: "#3b82f6" },
  { key: "corrections", label: "Observaciones", color: "#f97316" },
  { key: "approved",    label: "Aprobados",     color: "#22c55e" },
  { key: "certified",   label: "Certificados",  color: "#a78bfa" },
  { key: "rejected",    label: "Rechazados",    color: "#ef4444" },
];

function Pipeline({ counts, total, active }: {
  counts: Record<string, number>; total: number; active: boolean;
}) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
      {PIPELINE_STAGES.map((s, i) => {
        const n   = counts[s.key] ?? 0;
        const pct = total > 0 ? Math.round((n / total) * 100) : 0;
        return (
          <div key={s.key} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center hover:shadow-md transition-shadow">
            <div className="text-2xl font-bold tabular-nums leading-none mb-1"
              style={{ color: n > 0 ? s.color : "#cbd5e1" }}>{n}</div>
            <div className="text-[11px] font-semibold text-slate-400 mb-2.5">{s.label}</div>
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: active ? `${pct > 0 ? Math.max(pct, 4) : 0}%` : "0%",
                  backgroundColor: s.color,
                  transitionDelay: `${i * 80 + 300}ms`,
                }} />
            </div>
            <div className="text-[10px] text-slate-300 mt-1 tabular-nums font-semibold">{pct}%</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Funding card ──────────────────────────────────────────────────────────

function FundingCard({
  type, projects, total, active,
}: {
  type: "fondecyt" | "grant_uai";
  projects: Project[];
  total: number;
  active: boolean;
}) {
  const count_ = useCountUp(projects.length, active, type === "fondecyt" ? 200 : 350, 1200);
  const pct    = total > 0 ? Math.round((projects.length / total) * 100) : 0;
  const isF    = type === "fondecyt";

  const accent   = isF ? "#f59e0b"       : "#7c3aed";
  const bgStripe = isF ? "#fef3c7"       : "#ede9fe";
  const bgRow    = isF ? "bg-amber-50"   : "bg-violet-50";
  const bdRow    = isF ? "border-amber-100" : "border-violet-100";
  const txtBadge = isF ? "text-amber-700" : "text-violet-700";
  const bgBadge  = isF ? "bg-amber-100"  : "bg-violet-100";
  const barGrad  = isF
    ? "from-amber-400 to-orange-400"
    : "from-violet-400 to-purple-400";

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Color accent strip */}
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${accent}, ${bgStripe})` }} />

      <div className="p-6">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${accent}18` }}>
              <DollarSign className="w-4.5 h-4.5" style={{ color: accent }} />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm leading-tight">
                {isF ? "Fondecyt" : "Grant UAI"}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isF ? "ANID · Chile" : "Univ. Adolfo Ibáñez"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black tabular-nums leading-none" style={{ color: accent }}>
              {count_}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              proyecto{projects.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full bg-gradient-to-r ${barGrad} transition-all duration-1000 delay-300`}
              style={{ width: active ? `${pct > 0 ? Math.max(pct, 2) : 0}%` : "0%" }} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">{pct}% del total de proyectos</p>
        </div>

        {/* Researcher list */}
        {projects.length > 0 ? (
          <div className="space-y-1.5 max-h-44 overflow-y-auto">
            {projects.map((p) => (
              <div key={p.id}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border ${bgRow} ${bdRow}`}>
                <span className="text-xs font-semibold text-slate-700 truncate max-w-[60%]">
                  {p.researcher_name}
                </span>
                {p.funding_folio && (
                  <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${bgBadge} ${txtBadge}`}>
                    {p.funding_folio}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={`flex items-center justify-center py-5 rounded-xl border ${bgRow} ${bdRow}`}>
            <p className="text-xs text-slate-400 italic">Sin proyectos con este financiamiento</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Design system constants ────────────────────────────────────────────────

const CH = 260; // uniform chart height (px) across ALL charts
const AXIS_STYLE = { fontSize: 11, fill: "#94a3b8", fontFamily: "inherit" };
const STATUS_COLORS_CHART = {
  Aprobado:     "#10b981",
  Revisión:     "#3b82f6",
  Observaciones:"#f59e0b",
  Rechazado:    "#ef4444",
  Enviado:      "#94a3b8",
};

// ─── Chart card ─────────────────────────────────────────────────────────────

function ChartCard({ title, tag, icon: Icon, children, className }: {
  title: string; tag?: string; icon?: React.ElementType;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden ${className ?? ""}`}>
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        {Icon && (
          <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-slate-400" />
          </div>
        )}
        <div className="min-w-0">
          {tag && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] leading-none mb-1">{tag}</p>}
          <h3 className="font-bold text-slate-800 text-sm leading-tight">{title}</h3>
        </div>
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

// ─── Shared legend ───────────────────────────────────────────────────────────

function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-slate-50">
      {items.map(i => (
        <div key={i.label} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: i.color }} />
          <span className="text-[11px] text-slate-400 font-medium">{i.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Unified tooltip ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white rounded-xl px-3.5 py-2.5 shadow-2xl border border-white/[0.08] text-xs">
      {label && <p className="text-white/40 font-semibold uppercase tracking-wide text-[10px] mb-1.5">{label}</p>}
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          {payload.length > 1 && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />}
          <span className="font-bold tabular-nums">{p.value}</span>
          {payload.length > 1
            ? <span className="text-white/40 text-[10px]">{p.name}</span>
            : <span className="text-white/40 text-[10px]">proyecto{Number(p.value) !== 1 ? "s" : ""}</span>
          }
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
  const [meUser, setMeUser]       = useState<{ name?: string; email: string } | null>(null);
  const [seeding, setSeeding]     = useState(false);
  const [seedMsg, setSeedMsg]     = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!loading) {
      const id = setTimeout(() => setAnimated(true), 200);
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
    setSyncMsg(`✓ ${ok} sincronizado${ok !== 1 ? "s" : ""}${fail > 0 ? ` · ${fail} con error` : ""}`);
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
    setTemplateMsg({ id: docId, ok: res.ok, text: res.ok ? "Subido correctamente" : (data.error ?? "Error al subir") });
    if (res.ok) await loadTemplates();
    setUploading(null);
    setTimeout(() => setTemplateMsg(null), 3000);
  }

  async function reloadProjects() {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("projects")
      .select("id,title,status,project_type,theme,advisor_name,funding_type,funding_folio,researcher_name,researcher_email,reviewer,reviewer2,created_at")
      .order("created_at", { ascending: false });
    setProjects(data ?? []);
  }

  async function handleSeed() {
    setSeeding(true); setSeedMsg(null);
    const res  = await fetch("/api/seed", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setSeedMsg({ ok: true, text: `✓ ${data.projects?.ok ?? 0} proyectos · ${data.reviewers?.ok ?? 0} revisores · ${data.researchers?.ok ?? 0} cuentas cargadas` });
      await reloadProjects();
    } else {
      setSeedMsg({ ok: false, text: "Error al cargar datos de prueba" });
    }
    setSeeding(false);
    setTimeout(() => setSeedMsg(null), 6000);
  }

  async function handleDeleteSeed() {
    setSeeding(true); setSeedMsg(null);
    const res = await fetch("/api/seed", { method: "DELETE" });
    if (res.ok) {
      setSeedMsg({ ok: true, text: "✓ Datos de prueba eliminados" });
      await reloadProjects();
    }
    setSeeding(false);
    setTimeout(() => setSeedMsg(null), 4000);
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
      setMeUser(me);
      const supabase = getSupabase();
      supabase
        .from("projects")
        .select("id,title,status,project_type,theme,advisor_name,funding_type,funding_folio,researcher_name,researcher_email,reviewer,reviewer2,created_at")
        .order("created_at", { ascending: false })
        .then(({ data }) => { setProjects(data ?? []); setLoading(false); });
      loadTemplates();
    });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#CC5200] rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  // ── Data ─────────────────────────────────────────────────────────────────
  const total        = projects.length;
  const statusCounts = count(projects.map(p => p.status));
  const statusData   = Object.entries(STATUS_LABELS)
    .map(([key, label]) => ({ name: label, value: statusCounts[key] ?? 0, color: STATUS_COLORS[key] }));

  const typeCounts = count(projects.map(p => p.project_type));
  const typeData   = Object.entries(TYPE_LABELS)
    .map(([key, name]) => ({ name, value: typeCounts[key] ?? 0 }))
    .filter(d => d.value > 0);

  const themeCounts = count(projects.map(p => p.theme).filter(Boolean));
  const themeData   = themes
    .map(t => ({ name: t.emoji + " " + t.short, value: themeCounts[t.id] ?? 0 }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const fondecytProjects = projects.filter(p => p.funding_type === "fondecyt");
  const grantProjects    = projects.filter(p => p.funding_type === "grant_uai");
  const fundedTotal      = fondecytProjects.length + grantProjects.length;

  const advisorCounts = count(projects.map(p => p.advisor_name).filter((n): n is string => !!n));
  const advisorData   = Object.entries(advisorCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const monthlyMap: Record<string, number> = {};
  projects.forEach(p => {
    const d   = new Date(p.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    monthlyMap[key] = (monthlyMap[key] ?? 0) + 1;
  });
  const monthlyData = Object.entries(monthlyMap)
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      name: new Date(key+"-01").toLocaleDateString("es-CL",{ month:"short", year:"2-digit" }),
      value,
    }));

  // Monthly stacked by outcome
  const monthlyStackedMap: Record<string, Record<string, number>> = {};
  projects.forEach(p => {
    const d = new Date(p.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    if (!monthlyStackedMap[key]) monthlyStackedMap[key] = {};
    const s = p.status;
    monthlyStackedMap[key][s] = (monthlyStackedMap[key][s] ?? 0) + 1;
  });
  const monthlyStackedData = Object.entries(monthlyStackedMap)
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([key, st]) => ({
      name: new Date(key+"-01").toLocaleDateString("es-CL",{ month:"short", year:"2-digit" }),
      Aprobado:    (st["approved"] ?? 0) + (st["certified"] ?? 0),
      Revisión:     st["reviewing"]   ?? 0,
      Observaciones:st["corrections"] ?? 0,
      Rechazado:    st["rejected"]    ?? 0,
      Enviado:      st["submitted"]   ?? 0,
    }));

  // Type × approval breakdown
  const typeApprovalData = (Object.keys(TYPE_LABELS) as (keyof typeof TYPE_LABELS)[])
    .map(key => {
      const tp = projects.filter(p => p.project_type === key);
      if (!tp.length) return null;
      return {
        name: TYPE_LABELS[key],
        approved:    tp.filter(p => p.status === "approved" || p.status === "certified").length,
        corrections: tp.filter(p => p.status === "corrections").length,
        reviewing:   tp.filter(p => p.status === "reviewing" || p.status === "submitted").length,
        rejected:    tp.filter(p => p.status === "rejected").length,
        total:       tp.length,
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .sort((a, b) => b.total - a.total);

  // Radar: type distribution (for RadarChart)
  const radarData = Object.entries(TYPE_LABELS)
    .map(([key, name]) => ({ subject: name, value: typeCounts[key] ?? 0, fullMark: total || 1 }))
    .filter(d => d.value > 0);

  // Day of week distribution
  const DAY_LABELS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  const dayBuckets = [0,0,0,0,0,0,0];
  projects.forEach(p => { dayBuckets[new Date(p.created_at).getDay()]++; });
  const dayOfWeekData = DAY_LABELS.map((name, i) => ({ name, value: dayBuckets[i] }));

  // Key insights
  const numMonths     = Object.keys(monthlyMap).length;
  const avgPerMonth   = numMonths > 0 ? (total / numMonths).toFixed(1) : "0";
  const correctionRate= total > 0 ? Math.round((statusCounts["corrections"] ?? 0) / total * 100) : 0;
  const peakMonth     = [...monthlyData].sort((a,b) => b.value - a.value)[0];
  const topTypeEntry  = Object.entries(typeCounts).sort((a,b) => b[1]-a[1])[0];

  const pctOf = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  const approvalPct = total > 0
    ? Math.round(((statusCounts["approved"] ?? 0) + (statusCounts["certified"] ?? 0)) / total * 100)
    : 0;

  const statCards = [
    { label: "Total enviados",     value: total,                              icon: Activity,     color: "#60a5fa", ring: 100,                          pct: 100 },
    { label: "Aprobados",          value: statusCounts["approved"]   ?? 0,    icon: CheckCircle,  color: "#22c55e", ring: pctOf(statusCounts["approved"]   ?? 0), pct: pctOf(statusCounts["approved"] ?? 0) },
    { label: "En revisión",        value: statusCounts["reviewing"]  ?? 0,    icon: Clock,        color: "#3b82f6", ring: pctOf(statusCounts["reviewing"]  ?? 0), pct: pctOf(statusCounts["reviewing"] ?? 0) },
    { label: "Con observaciones",  value: statusCounts["corrections"]?? 0,    icon: AlertCircle,  color: "#f97316", ring: pctOf(statusCounts["corrections"] ?? 0), pct: pctOf(statusCounts["corrections"] ?? 0) },
    { label: "Rechazados",         value: statusCounts["rejected"]   ?? 0,    icon: XCircle,      color: "#ef4444", ring: pctOf(statusCounts["rejected"]   ?? 0), pct: pctOf(statusCounts["rejected"] ?? 0) },
    { label: "Con financiamiento", value: fundedTotal,                        icon: DollarSign,   color: "#c084fc", ring: pctOf(fundedTotal),            pct: pctOf(fundedTotal) },
  ];

  return (
    <div className="min-h-screen bg-slate-50/70">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-4 pt-8 pb-10">
        <div className="max-w-7xl mx-auto">

          {/* Title row */}
          <div className="flex items-start justify-between gap-4 mb-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#CC5200]/10 border border-[#CC5200]/20 flex items-center justify-center shrink-0">
                <BarChart2 className="w-4 h-4 text-[#CC5200]" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Comité de Ética · UAI</p>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight leading-tight">Panel de Estadísticas</h1>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 ml-2 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">En vivo</span>
              </div>
            </div>

            {/* Coordinator profile chip */}
            {meUser && (
              <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-2xl px-3 py-2 shadow-sm shrink-0">
                <div className="w-8 h-8 rounded-xl bg-[#CC5200] flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-black">
                    {(meUser.name ?? meUser.email).split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[160px]">
                    {meUser.name ?? "Coordinador"}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-tight truncate max-w-[160px]">{meUser.email}</p>
                </div>
                <div className="ml-1 flex items-center gap-1 bg-[#CC5200]/10 px-2 py-0.5 rounded-lg">
                  <Shield className="w-2.5 h-2.5 text-[#CC5200]" />
                  <span className="text-[9px] font-bold text-[#CC5200] uppercase tracking-wide">Admin</span>
                </div>
              </div>
            )}
          </div>
          <p className="text-slate-400 text-sm ml-12 mb-8">
            Escuela de Psicología · Universidad Adolfo Ibáñez
          </p>

          {/* Permisos de Coordinador link */}
          <div className="mb-7 ml-0">
            <Link href="/coordinador/miembros"
              className="inline-flex items-center gap-2.5 bg-violet-50 border border-violet-200 hover:bg-violet-100 hover:border-violet-300 text-violet-700 text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm">
              <Shield className="w-3.5 h-3.5" />
              Permisos de Coordinador
              <span className="text-[10px] bg-violet-200 text-violet-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Solo coordinador</span>
            </Link>
          </div>

          {/* KPI grid + Approval rate */}
          <div className="flex flex-col lg:flex-row items-stretch gap-4 mb-6">
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {statCards.map((s, i) => (
                <StatCard key={s.label} value={s.value} label={s.label}
                  icon={s.icon} color={s.color} pct={s.pct} delay={i * 90} active={animated} />
              ))}
            </div>
            <div className="lg:w-56 shrink-0">
              <ApprovalRateCard
                approvalPct={approvalPct}
                approved={(statusCounts["approved"] ?? 0) + (statusCounts["certified"] ?? 0)}
                total={total}
                active={animated}
              />
            </div>
          </div>

          {/* Pipeline */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">Flujo del proceso</p>
            <Pipeline counts={statusCounts} total={total} active={animated} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* ── Seed / datos de prueba ───────────────────────────────────── */}
        {projects.length === 0 ? (
          <div className="bg-amber-50 border-2 border-amber-200 border-dashed rounded-2xl p-8 text-center">
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <HardDrive className="w-7 h-7 text-amber-500" />
            </div>
            <h3 className="font-bold text-amber-900 text-base mb-1">Base de datos vacía</h3>
            <p className="text-amber-700 text-sm mb-5 max-w-sm mx-auto">
              No hay proyectos en el sistema. Carga los datos de prueba para poblar la base de datos con 45 proyectos y 40 revisores.
            </p>
            {seedMsg && (
              <p className={`text-sm font-semibold mb-4 ${seedMsg.ok ? "text-emerald-600" : "text-red-500"}`}>
                {seedMsg.text}
              </p>
            )}
            <button onClick={handleSeed} disabled={seeding}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors shadow-sm">
              {seeding
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Cargando...</>
                : <><Upload className="w-4 h-4" /> Cargar datos de prueba</>}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center shrink-0">
                <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Datos de prueba · {projects.length} proyectos en BD
              </p>
              {seedMsg && (
                <span className={`text-xs font-semibold ${seedMsg.ok ? "text-emerald-600" : "text-red-500"}`}>
                  {seedMsg.text}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={handleSeed} disabled={seeding}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-50 transition-colors">
                {seeding ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                Agregar datos
              </button>
              <button onClick={handleDeleteSeed} disabled={seeding}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 disabled:opacity-50 transition-colors">
                <Trash2 className="w-3 h-3" /> Limpiar prueba
              </button>
            </div>
          </div>
        )}

        {/* ── Google Drive banner ───────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3.5">
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
            <button onClick={handleSyncAll} disabled={syncing || projects.length === 0}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm">
              {syncing
                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sincronizando...</>
                : <><HardDrive className="w-3.5 h-3.5" /> Sincronizar todos</>}
            </button>
          </div>
        </div>

        {/* ── Insight strip ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { tag: "Actividad", label: "Promedio mensual",   value: avgPerMonth,   unit: "proyectos / mes",                           color: "#3b82f6", icon: TrendingUp },
            { tag: "Calidad",   label: "Correcciones",       value: `${correctionRate}%`, unit: "de proyectos requirieron ajustes",   color: "#f59e0b", icon: AlertCircle },
            { tag: "Tendencia", label: "Mes más activo",     value: peakMonth?.name ?? "—", unit: `${peakMonth?.value ?? 0} envíos`, color: "#10b981", icon: Calendar },
            { tag: "Tipo",      label: "Tipo predominante",  value: topTypeEntry ? TYPE_LABELS[topTypeEntry[0]] : "—", unit: topTypeEntry ? `${topTypeEntry[1]} proyectos` : "sin datos", color: "#8b5cf6", icon: Layers },
          ].map((ins) => (
            <div key={ins.label} className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5"
              style={{ borderLeftWidth: 3, borderLeftColor: ins.color }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${ins.color}14`, color: ins.color }}>
                  <ins.icon className="w-3 h-3" />
                </div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em]">{ins.tag}</span>
              </div>
              <div className="text-2xl font-black text-slate-800 leading-none tabular-nums mb-1">{ins.value}</div>
              <div className="text-[11px] text-slate-400">{ins.label} · {ins.unit}</div>
            </div>
          ))}
        </div>

        {/* ── Row 1: Monthly stacked (full-width) ───────────────────────── */}
        {monthlyStackedData.length > 1 && (
          <ChartCard title="Evolución mensual por resultado" tag="Tendencia" icon={TrendingUp}>
            <ResponsiveContainer width="100%" height={CH}>
              <BarChart data={monthlyStackedData} margin={{ left: 0, right: 8, top: 4 }} barCategoryGap="30%">
                <defs>
                  {(Object.entries(STATUS_COLORS_CHART) as [string, string][]).map(([key, color]) => (
                    <linearGradient key={`sg-${key}`} id={`sg-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.65} />
                    </linearGradient>
                  ))}
                </defs>
                <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={AXIS_STYLE} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                <Bar dataKey="Aprobado"      stackId="s" fill={`url(#sg-Aprobado)`} />
                <Bar dataKey="Revisión"      stackId="s" fill={`url(#sg-Revisión)`} />
                <Bar dataKey="Observaciones" stackId="s" fill={`url(#sg-Observaciones)`} />
                <Bar dataKey="Rechazado"     stackId="s" fill={`url(#sg-Rechazado)`} />
                <Bar dataKey="Enviado"       stackId="s" fill={`url(#sg-Enviado)`} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <ChartLegend items={Object.entries(STATUS_COLORS_CHART).map(([label, color]) => ({ label, color }))} />
          </ChartCard>
        )}

        {/* ── Row 2: Type approval | Day of week ────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {typeApprovalData.length > 0 && (
            <ChartCard title="Resultado por tipo de proyecto" tag="Análisis" icon={Zap}>
              <div className="space-y-4">
                {typeApprovalData.map((t) => {
                  const ap  = (t.approved    / t.total) * 100;
                  const cor = (t.corrections / t.total) * 100;
                  const rev = (t.reviewing   / t.total) * 100;
                  const rej = (t.rejected    / t.total) * 100;
                  return (
                    <div key={t.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-slate-700">{t.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black tabular-nums text-emerald-600">{Math.round(ap)}% apr.</span>
                          <span className="text-[10px] text-slate-300">· n={t.total}</span>
                        </div>
                      </div>
                      <div className="h-3 rounded-full overflow-hidden flex bg-slate-100">
                        {ap  > 0 && <div className="h-full transition-all duration-1000" style={{ width: animated ? `${ap}%`  : "0%", backgroundColor: STATUS_COLORS_CHART["Aprobado"],      transitionDelay: "400ms" }} />}
                        {cor > 0 && <div className="h-full transition-all duration-1000" style={{ width: animated ? `${cor}%` : "0%", backgroundColor: STATUS_COLORS_CHART["Observaciones"], transitionDelay: "550ms" }} />}
                        {rev > 0 && <div className="h-full transition-all duration-1000" style={{ width: animated ? `${rev}%` : "0%", backgroundColor: STATUS_COLORS_CHART["Revisión"],      transitionDelay: "700ms" }} />}
                        {rej > 0 && <div className="h-full rounded-r-full transition-all duration-1000" style={{ width: animated ? `${rej}%` : "0%", backgroundColor: STATUS_COLORS_CHART["Rechazado"],    transitionDelay: "850ms" }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
              <ChartLegend items={[
                { label: "Aprobado",     color: STATUS_COLORS_CHART["Aprobado"] },
                { label: "Observaciones",color: STATUS_COLORS_CHART["Observaciones"] },
                { label: "En revisión",  color: STATUS_COLORS_CHART["Revisión"] },
                { label: "Rechazado",    color: STATUS_COLORS_CHART["Rechazado"] },
              ]} />
            </ChartCard>
          )}

          <ChartCard title="Envíos por día de la semana" tag="Comportamiento" icon={Calendar}>
            <ResponsiveContainer width="100%" height={CH}>
              <BarChart data={dayOfWeekData} margin={{ left: 0, right: 8, top: 4 }} barCategoryGap="30%">
                <defs>
                  <linearGradient id="gradDay" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#c084fc" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={AXIS_STYLE} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(139,92,246,0.05)" }} />
                <Bar dataKey="value" fill="url(#gradDay)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── Funding spotlight ─────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-slate-200/60" />
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-200 bg-white shadow-sm">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.14em]">Financiamiento externo</span>
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black flex items-center justify-center">{fundedTotal}</span>
            </div>
            <div className="flex-1 h-px bg-slate-200/60" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <FundingCard type="fondecyt" projects={fondecytProjects} total={total} active={animated} />
            <FundingCard type="grant_uai" projects={grantProjects}    total={total} active={animated} />
          </div>
        </div>

        {/* ── Row 3: Status bars | Type radar/bars ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <ChartCard title="Distribución por estado" tag="Estado actual" icon={Activity}>
            <div className="space-y-3.5">
              {statusData.filter(d => d.value > 0).map((s) => {
                const p = total > 0 ? (s.value / total) * 100 : 0;
                return (
                  <div key={s.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-xs font-semibold text-slate-600">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black tabular-nums" style={{ color: s.color }}>{s.value}</span>
                        <span className="text-[10px] text-slate-300 w-8 text-right tabular-nums">{Math.round(p)}%</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{ width: animated ? `${p}%` : "0%", backgroundColor: s.color, transitionDelay: "300ms" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>

          {radarData.length >= 3 ? (
            <ChartCard title="Distribución por tipo" tag="Composición" icon={Layers}>
              <ResponsiveContainer width="100%" height={CH}>
                <RadarChart data={radarData} margin={{ top: 10, right: 28, bottom: 0, left: 28 }}>
                  <PolarGrid stroke="rgba(0,0,0,0.06)" radialLines={false} />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} />
                  <PolarRadiusAxis tick={false} axisLine={false} />
                  <Radar dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.15} dot={{ fill: "#3b82f6", r: 3, strokeWidth: 0 }} />
                  <Tooltip content={<ChartTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>
          ) : (
            <ChartCard title="Proyectos por tipo" tag="Composición" icon={Layers}>
              {typeData.length === 0
                ? <p className="text-slate-400 text-sm py-16 text-center">Sin datos aún.</p>
                : (
                  <ResponsiveContainer width="100%" height={CH}>
                    <BarChart data={typeData} layout="vertical" margin={{ left: 4, right: 40, top: 4 }}>
                      <defs>
                        <linearGradient id="gradBlue" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.7} />
                          <stop offset="100%" stopColor="#60a5fa" />
                        </linearGradient>
                      </defs>
                      <XAxis type="number" allowDecimals={false} tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={140} tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(59,130,246,0.04)" }} />
                      <Bar dataKey="value" fill="url(#gradBlue)" radius={[0, 4, 4, 0]}
                        label={{ position: "right", fontSize: 11, fill: "#94a3b8", fontWeight: 700 }} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </ChartCard>
          )}
        </div>

        {/* ── Row 4: Theme (full-width) ─────────────────────────────────── */}
        {themeData.length > 0 && (
          <ChartCard title="Proyectos por área temática" tag="Temática" icon={BookOpen}>
            <ResponsiveContainer width="100%" height={Math.max(CH, themeData.length * 38)}>
              <BarChart data={themeData} layout="vertical" margin={{ left: 4, right: 48, top: 4 }}>
                <defs>
                  <linearGradient id="gradOrange" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#CC5200" stopOpacity={0.75} />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
                <XAxis type="number" allowDecimals={false} tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={190} tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(204,82,0,0.04)" }} />
                <Bar dataKey="value" fill="url(#gradOrange)" radius={[0, 4, 4, 0]}
                  label={{ position: "right", fontSize: 11, fill: "#94a3b8", fontWeight: 700 }} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* ── Row 5: Advisor (full-width) ───────────────────────────────── */}
        {advisorData.length > 0 && (
          <ChartCard title="Proyectos por profesor/a guía" tag="Docentes" icon={Users2}>
            <ResponsiveContainer width="100%" height={Math.max(CH, advisorData.length * 36)}>
              <BarChart data={advisorData} layout="vertical" margin={{ left: 4, right: 48, top: 4 }}>
                <defs>
                  <linearGradient id="gradViolet" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
                <XAxis type="number" allowDecimals={false} tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={200} tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(124,58,237,0.04)" }} />
                <Bar dataKey="value" fill="url(#gradViolet)" radius={[0, 4, 4, 0]}
                  label={{ position: "right", fontSize: 11, fill: "#94a3b8", fontWeight: 700 }} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* ── Projects shortcut ─────────────────────────────────────────── */}
        <Link href="/projects"
          className="flex items-center justify-between gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-4 hover:bg-slate-50 hover:shadow-md transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#CC5200]/10 rounded-xl flex items-center justify-center shrink-0">
              <FolderOpen className="w-4 h-4 text-[#CC5200]" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">Ver todos los proyectos</p>
              <p className="text-xs text-slate-400">
                {projects.length} proyecto{projects.length !== 1 ? "s" : ""} · busca, filtra y gestiona
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#CC5200] transition-colors" />
        </Link>

        {/* ── Template management ───────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
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
                      : <p className="text-xs text-slate-400">Sin archivo · aparece como "Próximamente"</p>}
                    {msg && <p className={`text-xs mt-0.5 font-semibold ${msg.ok ? "text-emerald-600" : "text-red-500"}`}>{msg.ok ? "✓" : "✗"} {msg.text}</p>}
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

    </div>
  );
}
