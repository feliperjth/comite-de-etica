"use client";

import { useState } from "react";
import { Upload, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { safeStorageName } from "@/lib/storage";

const docLabels: Record<string, string> = {
  protocol:    "Protocolo de investigación",
  consent:     "Consentimiento informado",
  assent:      "Asentimiento informado",
  instruments: "Instrumentos / tests a utilizar",
  revision:    "Documento corregido (reenvío)",
};

type Missing = { id: string; doc_type: string; file_name: string };

/**
 * Permite re-subir documentos que quedaron sin archivo (file_path nulo) por
 * una subida fallida en el envío original. Sube el archivo a Storage y luego
 * llama a /repair-document para registrar el file_path. No cambia el estado
 * ni la ronda del proyecto.
 */
export default function RepairMissingDocs({
  projectId, code, missing,
}: { projectId: string; code: string; missing: Missing[] }) {
  const [pending, setPending] = useState<Missing[]>(missing);
  const [busyId, setBusyId]   = useState<string | null>(null);
  const [doneCount, setDone]  = useState(0);
  const [error, setError]     = useState<string | null>(null);

  if (pending.length === 0 && doneCount === 0) return null;

  async function handleFile(doc: Missing, file: File) {
    setError(null);
    setBusyId(doc.id);
    try {
      const supabase = getSupabase();
      const path = `${projectId}/${doc.doc_type}/${safeStorageName(file.name)}`;

      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const res = await fetch(`/api/projects/${projectId}/repair-document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, docId: doc.id, fileName: file.name, filePath: path }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "No se pudo registrar el archivo.");
      }

      setPending((p) => p.filter((d) => d.id !== doc.id));
      setDone((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir el archivo.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <h3 className="font-semibold text-amber-800 text-sm">Documentos faltantes</h3>
      </div>
      <p className="text-xs text-amber-700/90 mb-4 leading-relaxed">
        Estos documentos no se guardaron correctamente al enviar el proyecto.
        Vuelve a subirlos para que el comité pueda revisarlos.
      </p>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}

      <div className="space-y-2">
        {pending.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between gap-3 bg-white border border-amber-200 rounded-xl px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-700">
                {docLabels[doc.doc_type] ?? doc.doc_type}
              </p>
              <p className="text-xs text-slate-400 truncate">{doc.file_name}</p>
            </div>
            <label
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors shrink-0 ${
                busyId === doc.id
                  ? "bg-slate-100 text-slate-400 cursor-wait"
                  : "bg-[#CC5200] hover:bg-[#B34700] text-white"
              }`}
            >
              {busyId === doc.id
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Upload className="w-3.5 h-3.5" />}
              {busyId === doc.id ? "Subiendo..." : "Subir"}
              <input
                type="file"
                className="hidden"
                disabled={busyId !== null}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(doc, f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        ))}
      </div>

      {doneCount > 0 && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 mt-3">
          <CheckCircle className="w-3.5 h-3.5" />
          {doneCount} documento(s) restaurado(s). Recarga la página para verlos.
        </p>
      )}
    </div>
  );
}
