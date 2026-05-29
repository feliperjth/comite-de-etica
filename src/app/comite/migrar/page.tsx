"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertTriangle, Loader2, Copy, ExternalLink, Play, RefreshCw, Database } from "lucide-react";

interface MigrateStatus {
  existing: string[];
  pending: string[];
  sql: string;
  allReady: boolean;
}

const TABLE_LABELS: Record<string, string> = {
  project_messages: "Mensajes de proyecto",
  app_settings:     "Configuración de la app",
};

const SUPABASE_REF = "uwgnasjdpqgyoyaprddn";

export default function MigratePage() {
  const router = useRouter();
  const [status, setStatus]   = useState<MigrateStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult]   = useState<{ ok: boolean; message?: string; needsManual?: boolean; sql?: string; errors?: Record<string, string> } | null>(null);
  const [copied, setCopied]   = useState(false);

  async function loadStatus() {
    setLoading(true);
    const res = await fetch("/api/admin/migrate");
    if (res.ok) setStatus(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadStatus(); }, []);

  async function runMigration() {
    setRunning(true);
    setResult(null);
    const res = await fetch("/api/admin/migrate", { method: "POST" });
    const data = await res.json();
    setResult(data);
    setRunning(false);
    if (data.ok) await loadStatus();
  }

  async function copySQL() {
    const sql = result?.sql ?? status?.sql ?? "";
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-14">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Database className="w-7 h-7 text-[#CC5200]" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">Migración de base de datos</h1>
          <p className="text-slate-400 text-sm">Crea las tablas necesarias para mensajería y configuración</p>
        </div>

        {/* Status card */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" />
          </div>
        ) : status?.allReady ? (
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-8 text-center mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <p className="font-bold text-emerald-700 text-lg mb-1">Todo listo</p>
            <p className="text-slate-400 text-sm">Todas las tablas ya existen en la base de datos.</p>
            <button
              onClick={() => router.push("/revisores/dashboard")}
              className="mt-6 bg-[#1A1A1A] text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-black transition-colors"
            >
              Volver al panel
            </button>
          </div>
        ) : (
          <>
            {/* Tables grid */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Estado de tablas</p>
              <div className="space-y-3">
                {["project_messages", "app_settings"].map((name) => {
                  const exists = status?.existing.includes(name);
                  return (
                    <div key={name} className={`flex items-center gap-3 p-3 rounded-xl border ${
                      exists ? "border-emerald-100 bg-emerald-50" : "border-orange-100 bg-orange-50"
                    }`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        exists ? "bg-emerald-100" : "bg-orange-100"
                      }`}>
                        {exists
                          ? <CheckCircle className="w-4 h-4 text-emerald-600" />
                          : <AlertTriangle className="w-4 h-4 text-[#CC5200]" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-700 font-mono">{name}</p>
                        <p className="text-xs text-slate-400">{TABLE_LABELS[name]}</p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        exists ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-[#CC5200]"
                      }`}>
                        {exists ? "✓ Existe" : "⚠ Faltante"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Auto-migration button */}
            {!result?.ok && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
                <p className="font-semibold text-slate-700 mb-1 text-sm">Crear tablas automáticamente</p>
                <p className="text-xs text-slate-400 mb-4">
                  Intenta crear las tablas usando la conexión de base de datos configurada.
                  Si no funciona, sigue el método manual abajo.
                </p>
                <button
                  onClick={runMigration}
                  disabled={running}
                  className="flex items-center gap-2 bg-[#CC5200] hover:bg-[#B34700] disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
                >
                  {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {running ? "Ejecutando..." : "Crear tablas"}
                </button>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className={`rounded-2xl border p-5 mb-6 ${
                result.ok ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"
              }`}>
                {result.ok ? (
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-emerald-800 text-sm">{result.message}</p>
                      <button
                        onClick={() => router.push("/revisores/dashboard")}
                        className="text-xs text-emerald-600 underline mt-1"
                      >
                        Volver al panel →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                      <p className="font-semibold text-amber-800 text-sm">
                        La creación automática no funcionó. Usa el método manual abajo.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Manual method */}
            {(!result?.ok) && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <p className="font-semibold text-slate-700 mb-1 text-sm">Método manual (1 minuto)</p>
                <p className="text-xs text-slate-400 mb-4">
                  Abre el editor SQL de Supabase, pega el código y haz clic en Run.
                </p>

                <div className="flex gap-2 mb-3">
                  <a
                    href={`https://supabase.com/dashboard/project/${SUPABASE_REF}/sql/new`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold bg-[#1A1A1A] text-white px-4 py-2 rounded-lg hover:bg-black transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Abrir SQL Editor
                  </a>
                  <button
                    onClick={copySQL}
                    className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? "¡Copiado!" : "Copiar SQL"}
                  </button>
                  <button
                    onClick={loadStatus}
                    className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 text-slate-500 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <pre className="bg-slate-900 text-emerald-400 text-xs rounded-xl p-4 overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap">
                  {status?.sql}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
