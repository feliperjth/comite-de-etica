"use client";

import { useState } from "react";
import { Upload, CheckCircle, Loader2, FileText, X } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { safeStorageName } from "@/lib/storage";

interface Props {
  projectId: string;
  currentRound: number;
}

export default function ResubmitForm({ projectId, currentRound }: Props) {
  const [file, setFile]       = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState("");

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError("");

    try {
      const supabase = getSupabase();
      const path = `${projectId}/revision-${currentRound + 1}/${safeStorageName(file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Registro por el servidor: `documents` ya no es escribible desde el
      // navegador. Aquí hay sesión de investigador, así que autoriza sola.
      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_type: "revision", file_name: file.name, file_path: path }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "No se pudo registrar el documento.");
      }

      // Notify reviewers + update project status
      await fetch(`/api/projects/${projectId}/resubmit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ round: currentRound }),
      });

      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al subir el archivo.");
    } finally {
      setUploading(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
        <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
        <div>
          <p className="font-semibold text-emerald-700 text-sm">Documento enviado exitosamente</p>
          <p className="text-emerald-600 text-xs mt-0.5">Los revisores fueron notificados y realizarán una nueva evaluación.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6">
      <p className="text-sm font-bold text-[#CC5200] uppercase tracking-wide mb-1">Subir documento corregido</p>
      <p className="text-slate-500 text-xs mb-4 leading-relaxed">
        Incorpora las correcciones solicitadas y sube el documento actualizado. Ambos revisores serán notificados automáticamente.
      </p>

      {!file ? (
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-orange-200 rounded-xl p-6 cursor-pointer hover:border-[#CC5200] hover:bg-orange-100/50 transition-all">
          <Upload className="w-6 h-6 text-orange-300" />
          <span className="text-sm font-medium text-[#CC5200]">Seleccionar archivo</span>
          <span className="text-xs text-slate-400">PDF o Word</span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      ) : (
        <div className="flex items-center justify-between bg-white border border-orange-200 rounded-xl px-4 py-3 mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#CC5200] shrink-0" />
            <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{file.name}</span>
          </div>
          <button onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500 transition-colors ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <p className="text-red-600 text-xs mt-2">{error}</p>
      )}

      {file && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-[#CC5200] hover:bg-[#B34700] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors text-sm"
        >
          {uploading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
            : <><Upload className="w-4 h-4" /> Enviar correcciones</>}
        </button>
      )}
    </div>
  );
}
