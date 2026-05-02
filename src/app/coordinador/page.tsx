"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
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

function RingGauge({ pct, color, size = 52, sw = 4.5, delay = 0, active }: {
  pct: number; color: string; size?: number; sw?: number; delay?: number; active: boolean;
}) {
  const r = (size - sw) / 2;
  const C = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={sw} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={`${active ? Math.min(pct,100)/100*C : 0} ${C}`}
        style={{ transition: active ? `stroke-dasharray 1.8s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms` : "none" }} />
    </svg>
  );
}

// ─── KPI sub-component ─────────────────────────────────────────────────────

function KPICard({ value, label, icon: Icon, color, ring, delay, active }: {
  value: number; label: string; icon: React.ElementType;
  color: string; ring: number; delay: number; active: boolean;
}) {
  const displayed = useCountUp(value, active, delay);
  return (
    <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.05] p-4 overflow-hidden group hover:bg-white/[0.09] hover:border-white/[0.14] transition-all duration-300 cursor-default">
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-25 group-hover:opacity-40 transition-opacity pointer-events-none" style={{ backgroundColor: color }} />
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

// ─── Fondecyt SVG Seal ─────────────────────────────────────────────────────

function FondecytSeal({ size = 140 }: { size?: number }) {
  const C = size / 2;
  const OR = size * 0.44;
  const IR = size * 0.36;

  const ticks = Array.from({ length: 48 }, (_, i) => {
    const angle = (i / 48) * 2 * Math.PI;
    const major = i % 6 === 0;
    const inner = C + (major ? OR - size * 0.07 : OR - size * 0.045) * Math.cos(angle);
    const y1i   = C + (major ? OR - size * 0.07 : OR - size * 0.045) * Math.sin(angle);
    const x2o   = C + OR * Math.cos(angle);
    const y2o   = C + OR * Math.sin(angle);
    return { x1: inner, y1: y1i, x2: x2o, y2: y2o, major };
  });

  // 5-pointed star
  const starPts = Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * 2 * Math.PI - Math.PI / 2;
    const r = i % 2 === 0 ? size * 0.095 : size * 0.042;
    return `${C + r * Math.cos(angle)},${C - size * 0.13 + r * Math.sin(angle)}`;
  }).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="fGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="60%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#92400E" />
        </radialGradient>
        <radialGradient id="fGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FCD34D" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outer glow */}
      <circle cx={C} cy={C} r={OR + size * 0.09} fill="url(#fGlow)" />

      {/* Tick marks */}
      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke="#F59E0B" strokeWidth={t.major ? 2 : 1} strokeOpacity={t.major ? 0.7 : 0.4} />
      ))}

      {/* Outer ring */}
      <circle cx={C} cy={C} r={OR} fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeOpacity="0.5" />

      {/* Main filled circle */}
      <circle cx={C} cy={C} r={IR} fill="url(#fGrad)" />

      {/* Inner decorative ring */}
      <circle cx={C} cy={C} r={IR * 0.92} fill="none" stroke="#FDE68A" strokeWidth="1" strokeOpacity="0.45" strokeDasharray="3 3" />

      {/* 5-pointed star */}
      <polygon points={starPts} fill="#FFFBEB" fillOpacity="0.95" />

      {/* FONDECYT text */}
      <text x={C} y={C + size * 0.07} textAnchor="middle"
        fontSize={size * 0.092} fontWeight="800" fill="#FFFBEB" letterSpacing="1.2"
        style={{ fontFamily: "system-ui, sans-serif" }}>
        FONDECYT
      </text>

      {/* ANID subtext */}
      <text x={C} y={C + size * 0.18} textAnchor="middle"
        fontSize={size * 0.065} fill="#FDE68A" letterSpacing="1.5"
        style={{ fontFamily: "system-ui, sans-serif" }}>
        ANID · CHILE
      </text>
    </svg>
  );
}

// ─── Grant / UAI Shield Seal ───────────────────────────────────────────────

function GrantSeal({ size = 140 }: { size?: number }) {
  const C = size / 2;
  const s = size;

  const shield = `
    M ${C} ${s * 0.05}
    L ${s * 0.88} ${s * 0.24}
    L ${s * 0.88} ${s * 0.58}
    Q ${s * 0.88} ${s * 0.90} ${C} ${s * 0.97}
    Q ${s * 0.12} ${s * 0.90} ${s * 0.12} ${s * 0.58}
    L ${s * 0.12} ${s * 0.24}
    Z
  `;
  const shieldInner = `
    M ${C} ${s * 0.12}
    L ${s * 0.80} ${s * 0.28}
    L ${s * 0.80} ${s * 0.57}
    Q ${s * 0.80} ${s * 0.84} ${C} ${s * 0.90}
    Q ${s * 0.20} ${s * 0.84} ${s * 0.20} ${s * 0.57}
    L ${s * 0.20} ${s * 0.28}
    Z
  `;

  // Column x positions
  const cols = [C - s * 0.17, C, C + s * 0.17];
  const colTop = s * 0.46, colH = s * 0.22, colW = s * 0.06;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="gGrad" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>
        <radialGradient id="gGlow" cx="50%" cy="20%" r="60%">
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outer glow */}
      <path d={shield} fill="url(#gGlow)" transform={`scale(1.08) translate(${-C * 0.08}, ${-s * 0.04})`} />

      {/* Shield body */}
      <path d={shield} fill="url(#gGrad)" />

      {/* Inner shield outline */}
      <path d={shieldInner} fill="none" stroke="#C4B5FD" strokeWidth="1" strokeOpacity="0.35" />

      {/* Horizontal divider line */}
      <line x1={s * 0.22} y1={s * 0.42} x2={s * 0.78} y2={s * 0.42} stroke="#A78BFA" strokeWidth="0.8" strokeOpacity="0.5" />

      {/* Pediment / triangle roof */}
      <polygon
        points={`${C},${s * 0.30} ${C - s * 0.24},${s * 0.43} ${C + s * 0.24},${s * 0.43}`}
        fill="#C4B5FD" fillOpacity="0.25" stroke="#DDD6FE" strokeWidth="0.8" strokeOpacity="0.5"
      />

      {/* Columns */}
      {cols.map((cx, i) => (
        <rect key={i} x={cx - colW / 2} y={colTop} width={colW} height={colH} rx={colW * 0.25}
          fill="#EDE9FE" fillOpacity="0.3" />
      ))}

      {/* Column base */}
      <rect x={C - s * 0.25} y={colTop + colH} width={s * 0.5} height={s * 0.03}
        rx={s * 0.01} fill="#DDD6FE" fillOpacity="0.35" />

      {/* UAI text */}
      <text x={C} y={s * 0.77} textAnchor="middle"
        fontSize={s * 0.15} fontWeight="900" fill="#FFFFFF" letterSpacing="3"
        style={{ fontFamily: "system-ui, sans-serif" }}>
        UAI
      </text>

      {/* GRANT subtext */}
      <text x={C} y={s * 0.86} textAnchor="middle"
        fontSize={s * 0.065} fill="#DDD6FE" letterSpacing="1.5"
        style={{ fontFamily: "system-ui, sans-serif" }}>
        GRANT · DOCENTE
      </text>
    </svg>
  );
}

// ─── Funding card (sub-component, has own hook) ────────────────────────────

function FundingCard({
  type, projects, total, active,
}: {
  type: "fondecyt" | "grant_uai";
  projects: Project[];
  total: number;
  active: boolean;
}) {
  const count_ = useCountUp(projects.length, active, type === "fondecyt" ? 200 : 350, 1200);
  const pct = total > 0 ? Math.round((projects.length / total) * 100) : 0;

  const isFondecyt = type === "fondecyt";

  return (
    <div className={`relative rounded-3xl overflow-hidden border shadow-xl ${
      isFondecyt
        ? "border-amber-200/60 shadow-amber-100"
        : "border-violet-200/60 shadow-violet-100"
    }`}>
      {/* Background */}
      <div className={`absolute inset-0 ${
        isFondecyt
          ? "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50"
          : "bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50"
      }`} />

      {/* Decorative glow */}
      <div className={`absolute -top-10 -left-10 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-40 ${
        isFondecyt ? "bg-amber-300" : "bg-violet-300"
      }`} />
      <div className={`absolute -bottom-8 -right-8 w-36 h-36 rounded-full blur-2xl pointer-events-none opacity-25 ${
        isFondecyt ? "bg-orange-400" : "bg-purple-400"
      }`} />

      <div className="relative p-7 flex gap-7 items-start">
        {/* Badge */}
        <div className="shrink-0 flex flex-col items-center gap-2">
          {isFondecyt ? <FondecytSeal size={132} /> : <GrantSeal size={132} />}
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
            isFondecyt ? "bg-amber-200 text-amber-800" : "bg-violet-200 text-violet-800"
          }`}>
            {isFondecyt ? "ANID · Chile" : "Univ. Adolfo Ibáñez"}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className={`text-xl font-black tracking-tight ${isFondecyt ? "text-amber-900" : "text-violet-900"}`}>
                {isFondecyt ? "Fondecyt" : "Grant / Proyecto UAI"}
              </h3>
              <p className={`text-xs font-medium mt-0.5 ${isFondecyt ? "text-amber-700/70" : "text-violet-700/70"}`}>
                {isFondecyt
                  ? "Fondo Nacional de Desarrollo Científico y Tecnológico"
                  : "Proyectos docentes y de investigación UAI"}
              </p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <div className={`text-5xl font-black tabular-nums leading-none ${isFondecyt ? "text-amber-600" : "text-violet-600"}`}>
                {count_}
              </div>
              <div className={`text-xs font-semibold mt-0.5 ${isFondecyt ? "text-amber-500" : "text-violet-500"}`}>
                proyecto{projects.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 mb-4">
            <div className={`h-2 rounded-full overflow-hidden ${isFondecyt ? "bg-amber-200/50" : "bg-violet-200/50"}`}>
              <div
                className={`h-full rounded-full transition-all duration-1000 delay-500 ${
                  isFondecyt
                    ? "bg-gradient-to-r from-amber-400 to-orange-500"
                    : "bg-gradient-to-r from-violet-400 to-purple-500"
                }`}
                style={{ width: active ? `${pct}%` : "0%" }}
              />
            </div>
            <p className={`text-[11px] mt-1.5 ${isFondecyt ? "text-amber-600/60" : "text-violet-600/60"}`}>
              {pct}% del total de proyectos del comité
            </p>
          </div>

          {/* Projects grid */}
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
              {projects.map((p) => (
                <div key={p.id} className={`flex items-center justify-between rounded-xl px-3 py-2 border ${
                  isFondecyt
                    ? "bg-white/60 border-amber-100 hover:border-amber-300"
                    : "bg-white/60 border-violet-100 hover:border-violet-300"
                } transition-colors`}>
                  <span className={`text-xs font-semibold truncate max-w-[58%] ${
                    isFondecyt ? "text-amber-900" : "text-violet-900"
                  }`}>
                    {p.researcher_name}
                  </span>
                  {p.funding_folio && (
                    <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                      isFondecyt
                        ? "bg-amber-200 text-amber-800"
                        : "bg-violet-200 text-violet-800"
                    }`}>
                      {p.funding_folio}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-xs italic ${isFondecyt ? "text-amber-500/60" : "text-violet-500/60"}`}>
              Sin proyectos con este financiamiento actualmente.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Chart helpers ─────────────────────────────────────────────────────────

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
          <p className="text-white/40 text-sm font-medium">Cargando estadísticas...</p>
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
    .map(t => ({ name: t.emoji + " " + t.label.split(" ").slice(0, 3).join(" "), value: themeCounts[t.id] ?? 0 }))
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

  const pctOf = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  const statCards = [
    { label: "Total enviados",     value: total,                              icon: Activity,     color: "#60a5fa", ring: 100 },
    { label: "Aprobados",          value: statusCounts["approved"]   ?? 0,    icon: CheckCircle,  color: "#22c55e", ring: pctOf(statusCounts["approved"]   ?? 0) },
    { label: "En revisión",        value: statusCounts["reviewing"]  ?? 0,    icon: Clock,        color: "#3b82f6", ring: pctOf(statusCounts["reviewing"]  ?? 0) },
    { label: "Con observaciones",  value: statusCounts["corrections"]?? 0,    icon: AlertCircle,  color: "#f97316", ring: pctOf(statusCounts["corrections"] ?? 0) },
    { label: "Rechazados",         value: statusCounts["rejected"]   ?? 0,    icon: XCircle,      color: "#ef4444", ring: pctOf(statusCounts["rejected"]   ?? 0) },
    { label: "Con financiamiento", value: fundedTotal,                        icon: DollarSign,   color: "#c084fc", ring: pctOf(fundedTotal) },
  ];

  const axisStyle = { fontSize: 11, fill: "#94a3b8" };

  return (
    <div className="min-h-screen bg-slate-50/70">

      {/* ── Dark animated header ─────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-[#040E1C] via-[#071422] to-[#0C1F38] px-4 pt-11 pb-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-700/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#CC5200]/8 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/4" />
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:26px_26px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-[#CC5200]/20 border border-[#CC5200]/30 flex items-center justify-center shrink-0">
              <BarChart2 className="w-4 h-4 text-[#CC5200]" />
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {statCards.map((s, i) => (
              <KPICard key={s.label} value={s.value} label={s.label}
                icon={s.icon} color={s.color} ring={s.ring} delay={i * 90} active={animated} />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

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

        {/* ── Funding spotlight ─────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-violet-300/40" />
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-200 bg-white shadow-sm">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Proyectos con Financiamiento Externo</span>
              <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-black flex items-center justify-center">
                {fundedTotal}
              </span>
            </div>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-amber-300/40 to-violet-300/40" />
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <FundingCard type="fondecyt" projects={fondecytProjects} total={total} active={animated} />
            <FundingCard type="grant_uai" projects={grantProjects}    total={total} active={animated} />
          </div>
        </div>

        {/* ── Analytics 2-col ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Status donut */}
          <ChartCard title="Estado de proyectos" accent="#CC5200">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusData.filter(d => d.value > 0)} dataKey="value" nameKey="name"
                  cx="50%" cy="48%" outerRadius={88} innerRadius={52} paddingAngle={3} stroke="none"
                  animationBegin={animated ? 0 : 9999} animationDuration={1400}>
                  {statusData.filter(d => d.value > 0).map((e) => (
                    <Cell key={e.name} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
                <Legend content={<CustomLegend />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Type bars */}
          <ChartCard title="Tipo de investigación" icon={BookOpen} accent="#3b82f6">
            {typeData.length === 0
              ? <p className="text-slate-400 text-sm py-10 text-center">Sin datos aún.</p>
              : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={typeData} layout="vertical" margin={{ left: 8, right: 24, top: 4 }}>
                    <defs>
                      <linearGradient id="barBlue" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.65} />
                        <stop offset="100%" stopColor="#60a5fa" />
                      </linearGradient>
                    </defs>
                    <XAxis type="number" allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={145} tick={axisStyle} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(59,130,246,0.05)" }} />
                    <Bar dataKey="value" fill="url(#barBlue)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
          </ChartCard>

          {/* Theme bars */}
          <ChartCard title="Área temática" icon={BookOpen} accent="#CC5200">
            {themeData.length === 0
              ? <p className="text-slate-400 text-sm py-10 text-center">Sin datos aún.</p>
              : (
                <ResponsiveContainer width="100%" height={290}>
                  <BarChart data={themeData} layout="vertical" margin={{ left: 8, right: 24, top: 4 }}>
                    <defs>
                      <linearGradient id="barOrange" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#CC5200" stopOpacity={0.7} />
                        <stop offset="100%" stopColor="#f97316" />
                      </linearGradient>
                    </defs>
                    <XAxis type="number" allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={160} tick={axisStyle} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(204,82,0,0.05)" }} />
                    <Bar dataKey="value" fill="url(#barOrange)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
          </ChartCard>

          {/* Monthly trend */}
          {monthlyData.length > 1
            ? (
              <ChartCard title="Proyectos enviados por mes" icon={TrendingUp} accent="#22c55e">
                <ResponsiveContainer width="100%" height={290}>
                  <AreaChart data={monthlyData} margin={{ left: 0, right: 16, top: 8 }}>
                    <defs>
                      <linearGradient id="areaGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} cursor={{ stroke: "#22c55e", strokeWidth: 1, strokeOpacity: 0.3 }} />
                    <Area dataKey="value" stroke="#22c55e" strokeWidth={2.5} fill="url(#areaGreen)" dot={{ r: 3, fill: "#22c55e", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            )
            : (
              <ChartCard title="Proyectos por estado (detalle)" accent="#f59e0b">
                <div className="space-y-3 pt-2">
                  {statusData.filter(d => d.value > 0).map((s) => (
                    <div key={s.name}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-600">{s.name}</span>
                        <span className="text-xs font-bold tabular-nums" style={{ color: s.color }}>{s.value}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000"
                          style={{ width: animated && total > 0 ? `${(s.value/total)*100}%` : "0%", backgroundColor: s.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </ChartCard>
            )
          }
        </div>

        {/* Advisors full-width */}
        {advisorData.length > 0 && (
          <ChartCard title="Proyectos por profesor/a guía" icon={TrendingUp} accent="#8b5cf6">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={advisorData} layout="vertical" margin={{ left: 8, right: 24, top: 4 }}>
                <defs>
                  <linearGradient id="barViolet" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.65} />
                    <stop offset="100%" stopColor="#c084fc" />
                  </linearGradient>
                </defs>
                <XAxis type="number" allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={190} tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(139,92,246,0.05)" }} />
                <Bar dataKey="value" fill="url(#barViolet)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* ── Projects list ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
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
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <StatusBadge status={p.status} />
                    {p.funding_type && p.funding_type !== "none" && p.funding_folio && (
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg ${
                        p.funding_type === "fondecyt"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-violet-100 text-violet-800"
                      }`}>
                        {p.funding_type === "fondecyt" ? "Fondecyt" : "Grant"} {p.funding_folio}
                      </span>
                    )}
                    <span className="text-xs text-slate-300">{new Date(p.created_at).toLocaleDateString("es-CL")}</span>
                  </div>
                </div>
                <button onClick={() => setConfirmDelete(p)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                  title="Eliminar proyecto">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

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
