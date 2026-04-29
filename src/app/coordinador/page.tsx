"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { getSupabase } from "@/lib/supabase";
import { themes } from "@/lib/themes";
import { BarChart2, FolderOpen, CheckCircle, AlertCircle, Clock, XCircle, TrendingUp, BookOpen, DollarSign, Upload, Trash2, FileText, RefreshCw, HardDrive } from "lucide-react";

const DOC_DEFINITIONS = [
  { id: "protocol",    label: "Protocolo de investigación",              required: true  },
  { id: "consent",     label: "Consentimiento informado",                required: true  },
  { id: "assent",      label: "Asentimiento informado (menores)",        required: false },
  { id: "instruments", label: "Instrumentos / tests a utilizar",         required: false },
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
  pregrado:   "Pregrado",
  magister:   "Magíster",
  doctorado:  "Doctorado",
  docente:    "Docente/Investigador",
  fondecyt:   "Fondecyt",
  externo:    "Externo",
};
const FUNDING_COLORS = ["#8b5cf6", "#CC5200", "#94a3b8"];

type Project = {
  id: string;
  status: string;
  project_type: string;
  theme: string;
  advisor_name: string | null;
  funding_type: string | null;
  funding_folio: string | null;
  researcher_name: string;
  created_at: string;
};

function count<T extends string>(arr: T[]): Record<string, number> {
  return arr.reduce((acc, v) => ({ ...acc, [v]: (acc[v] ?? 0) + 1 }), {} as Record<string, number>);
}

export default function CoordinadorStats() {
  const router = useRouter();
  const [projects, setProjects]       = useState<Project[]>([]);
  const [loading, setLoading]         = useState(true);
  const [templates, setTemplates]     = useState<Record<string, string>>({});
  const [uploading, setUploading]     = useState<string | null>(null);
  const [deleting, setDeleting]       = useState<string | null>(null);
  const [templateMsg, setTemplateMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);
  const [syncing, setSyncing]         = useState(false);
  const [syncMsg, setSyncMsg]         = useState<string | null>(null);

  async function handleSyncAll() {
    setSyncing(true);
    setSyncMsg(null);
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
    setUploading(docId);
    setTemplateMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("docId", docId);
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

  async function handleTemplateDelete(docId: string) {
    setDeleting(docId);
    await fetch("/api/admin/templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId }),
    });
    await loadTemplates();
    setDeleting(null);
  }

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(me => {
      if (me.email !== ADMIN_EMAIL) { router.push("/"); return; }
      const supabase = getSupabase();
      supabase
        .from("projects")
        .select("id,status,project_type,theme,advisor_name,funding_type,funding_folio,researcher_name,created_at")
        .order("created_at", { ascending: true })
        .then(({ data }) => { setProjects(data ?? []); setLoading(false); });
      loadTemplates();
    });
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#CC5200] rounded-full animate-spin" />
      </div>
    );
  }

  const total = projects.length;

  // ── Status ──────────────────────────────────────────────────────────
  const statusCounts = count(projects.map(p => p.status));
  const statusData = Object.entries(STATUS_LABELS).map(([key, label]) => ({
    name: label, value: statusCounts[key] ?? 0, color: STATUS_COLORS[key],
  }));

  // ── Project type ────────────────────────────────────────────────────
  const typeCounts = count(projects.map(p => p.project_type));
  const typeData = Object.entries(TYPE_LABELS)
    .map(([key, name]) => ({ name, value: typeCounts[key] ?? 0 }))
    .filter(d => d.value > 0);

  // ── Themes ─────────────────────────────────────────────────────────
  const themeCounts = count(projects.map(p => p.theme).filter(Boolean));
  const themeData = themes
    .map(t => ({ name: t.emoji + " " + t.label.split(" ").slice(0, 2).join(" "), value: themeCounts[t.id] ?? 0 }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  // ── Funding ─────────────────────────────────────────────────────────
  const fundingCounts = count(projects.map(p => p.funding_type ?? "none"));
  const fundingData = [
    { name: "Fondecyt",       value: fundingCounts["fondecyt"]  ?? 0 },
    { name: "Grant / Docente", value: fundingCounts["grant_uai"] ?? 0 },
    { name: "Sin financiamiento", value: fundingCounts["none"]   ?? 0 },
  ].filter(d => d.value > 0);

  const fundedProjects = projects.filter(p => p.funding_type && p.funding_type !== "none");

  // ── Advisors ────────────────────────────────────────────────────────
  const advisorCounts = count(
    projects.map(p => p.advisor_name).filter((n): n is string => !!n)
  );
  const advisorData = Object.entries(advisorCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // ── Monthly trend ───────────────────────────────────────────────────
  const monthlyMap: Record<string, number> = {};
  projects.forEach(p => {
    const d    = new Date(p.created_at);
    const key  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap[key] = (monthlyMap[key] ?? 0) + 1;
  });
  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      name: new Date(key + "-01").toLocaleDateString("es-CL", { month: "short", year: "2-digit" }),
      value,
    }));

  const statCards = [
    { label: "Total enviados",      value: total,                              icon: FolderOpen,   color: "text-slate-700",   bg: "bg-slate-100"   },
    { label: "Aprobados",           value: statusCounts["approved"]  ?? 0,     icon: CheckCircle,  color: "text-emerald-600", bg: "bg-emerald-50"  },
    { label: "En revisión",         value: statusCounts["reviewing"] ?? 0,     icon: Clock,        color: "text-blue-600",    bg: "bg-blue-50"     },
    { label: "Con observaciones",   value: statusCounts["corrections"] ?? 0,   icon: AlertCircle,  color: "text-orange-500",  bg: "bg-orange-50"   },
    { label: "Rechazados",          value: statusCounts["rejected"]  ?? 0,     icon: XCircle,      color: "text-red-500",     bg: "bg-red-50"      },
    { label: "Con financiamiento",  value: fundedProjects.length,              icon: DollarSign,   color: "text-violet-600",  bg: "bg-violet-50"   },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-1">
          <BarChart2 className="w-7 h-7 text-[#CC5200]" />
          <h1 className="text-3xl font-bold text-uai-navy">Estadísticas</h1>
        </div>
        <p className="text-slate-400 text-sm ml-10">Panel de análisis · Comité de Ética Escuela de Psicología UAI</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        {statCards.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-slate-400 text-xs mt-0.5 leading-tight">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Google Drive sync banner */}
      {process.env.NEXT_PUBLIC_DRIVE_ENABLED === "1" || true ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-4 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Google Drive · Comité de Ética</p>
              <p className="text-xs text-slate-400">Los proyectos se sincronizan automáticamente al ser enviados. Usa el botón para re-sincronizar todos.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {syncMsg && <span className="text-xs font-semibold text-emerald-600">{syncMsg}</span>}
            <button
              onClick={handleSyncAll}
              disabled={syncing || projects.length === 0}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              {syncing
                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sincronizando...</>
                : <><HardDrive className="w-3.5 h-3.5" /> Sincronizar todos</>
              }
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Estado de proyectos */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-bold text-slate-700 mb-5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#CC5200] inline-block" /> Estado de proyectos
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData.filter(d => d.value > 0)} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3}>
                {statusData.filter(d => d.value > 0).map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v} proyecto${Number(v) !== 1 ? "s" : ""}`, ""]} />
              <Legend iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Tipo de investigación */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-bold text-slate-700 mb-5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Tipo de investigación
          </h2>
          {typeData.length === 0 ? <p className="text-slate-400 text-sm">Sin datos.</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={typeData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v} proyecto${Number(v) !== 1 ? "s" : ""}`, ""]} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Temática */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-bold text-slate-700 mb-5 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-400" /> Área temática
          </h2>
          {themeData.length === 0 ? <p className="text-slate-400 text-sm">Sin datos.</p> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={themeData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v} proyecto${Number(v) !== 1 ? "s" : ""}`, ""]} />
                <Bar dataKey="value" fill="#CC5200" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Financiamiento */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-bold text-slate-700 mb-5 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-slate-400" /> Financiamiento
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={fundingData} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={75} innerRadius={40} paddingAngle={3}>
                {fundingData.map((_, i) => (
                  <Cell key={i} fill={FUNDING_COLORS[i % FUNDING_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v} proyecto${Number(v) !== 1 ? "s" : ""}`, ""]} />
              <Legend iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>

          {/* Funded projects list */}
          {fundedProjects.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Proyectos con folio</p>
              {fundedProjects.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                  <div className="text-xs text-slate-600 truncate max-w-[60%]">{p.researcher_name}</div>
                  <span className="text-xs font-mono bg-violet-100 text-violet-700 px-2 py-0.5 rounded font-bold">
                    {p.funding_type === "fondecyt" ? "Fondecyt" : "Grant"} {p.funding_folio}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Advisors */}
      {advisorData.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-6">
          <h2 className="font-bold text-slate-700 mb-5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" /> Proyectos por profesor/a guía
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={advisorData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v} proyecto${Number(v) !== 1 ? "s" : ""}`, ""]} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly trend */}
      {monthlyData.length > 1 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-bold text-slate-700 mb-5 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-slate-400" /> Proyectos enviados por mes
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ left: 0, right: 10 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v} proyecto${Number(v) !== 1 ? "s" : ""}`, ""]} />
              <Bar dataKey="value" fill="#1A1A1A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* ── Template management ───────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#CC5200]" /> Plantillas para investigadores
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Estos archivos aparecen en la página <strong>/documentos</strong> para que los investigadores los descarguen antes de enviar.
            </p>
          </div>
          <button onClick={loadTemplates} className="text-slate-400 hover:text-slate-600 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {DOC_DEFINITIONS.map(doc => {
            const hasFile    = !!templates[doc.id];
            const isUploading = uploading === doc.id;
            const isDeleting  = deleting  === doc.id;
            const msg         = templateMsg?.id === doc.id ? templateMsg : null;

            return (
              <div key={doc.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                hasFile ? "border-emerald-200 bg-emerald-50/40" : "border-slate-100 bg-slate-50/50"
              }`}>
                {/* Icon + label */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  hasFile ? "bg-emerald-100" : "bg-slate-100"
                }`}>
                  <FileText className={`w-4 h-4 ${hasFile ? "text-emerald-600" : "text-slate-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700">
                    {doc.label}
                    {doc.required && <span className="text-red-400 ml-1 text-xs">obligatorio</span>}
                  </p>
                  {hasFile
                    ? <a href={templates[doc.id]} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-emerald-600 hover:underline">Ver archivo actual</a>
                    : <p className="text-xs text-slate-400">Sin archivo · aparece como "Próximamente"</p>
                  }
                  {msg && (
                    <p className={`text-xs mt-0.5 font-semibold ${msg.ok ? "text-emerald-600" : "text-red-500"}`}>
                      {msg.ok ? "✓" : "✗"} {msg.text}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <label className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                    hasFile
                      ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      : "bg-uai-navy text-white hover:bg-uai-navy-dark"
                  }`}>
                    {isUploading
                      ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Subiendo...</>
                      : <><Upload className="w-3.5 h-3.5" /> {hasFile ? "Reemplazar" : "Subir"}</>
                    }
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      disabled={isUploading}
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) handleTemplateUpload(doc.id, f);
                        e.target.value = "";
                      }}
                    />
                  </label>

                  {hasFile && (
                    <button
                      onClick={() => handleTemplateDelete(doc.id)}
                      disabled={isDeleting}
                      className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Eliminar plantilla"
                    >
                      {isDeleting
                        ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
