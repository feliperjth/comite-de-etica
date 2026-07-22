"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  FileText, ChevronDown, ChevronUp, Eye, Download, X, ExternalLink, AlertTriangle,
  Trash2, RefreshCw, Loader2,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { safeStorageName } from "@/lib/storage";
import { docLabel } from "@/lib/documents";

type Doc = {
  id: string;
  doc_type: string;
  file_name: string;
  url: string | null;
  canManage?: boolean;
  bloqueo?: string | null;
};

/**
 * Ruta del archivo de reemplazo en Storage. Fuera del componente a propósito:
 * `Date.now()` es impuro y React no admite llamarlo durante el render.
 * El sufijo temporal evita chocar con el archivo al que sustituye.
 */
function rutaStorage(projectId: string, docType: string, fileName: string): string {
  return `${projectId}/${docType}/${Date.now()}_${safeStorageName(fileName)}`;
}

type Props = {
  projectId: string;
  /** Muestra los botones de eliminar y reemplazar en los documentos permitidos. */
  manage?: boolean;
  /** Incluye también los documentos con comentarios de los revisores. */
  scopeAll?: boolean;
  /** En listados de varios proyectos conviene arrancar plegado. */
  defaultOpen?: boolean;
};

/**
 * Collapsible panel listing every document the researcher uploaded for a
 * project, with in-app viewer and download. Used in all reviewer flows
 * (individual, download, group) so documents are always accessible.
 *
 * Con `manage`, además permite archivar y reemplazar los documentos que la
 * sesión pueda gestionar. Quién puede qué lo decide el servidor: aquí solo se
 * pinta lo que venga en `canManage`.
 */
export default function ProjectDocumentsPanel({
  projectId, manage = false, scopeAll = false, defaultOpen = true,
}: Props) {
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [loaded, setLoaded]       = useState(false);
  const [open, setOpen]           = useState(defaultOpen);
  const [viewer, setViewer]       = useState<{ url: string; name: string } | null>(null);
  const [busy, setBusy]           = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const panelRef                  = useRef<HTMLDivElement>(null);

  const cargar = useCallback(() => {
    return fetch(`/api/projects/${projectId}/documents${scopeAll ? "?scope=all" : ""}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setDocuments(d.documents ?? []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [projectId, scopeAll]);

  useEffect(() => { cargar(); }, [cargar]);

  async function eliminar(doc: Doc) {
    setBusy(doc.id); setError(null);
    try {
      const res  = await fetch(`/api/projects/${projectId}/documents/${doc.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      await cargar();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar el documento.");
    } finally {
      setBusy(null); setConfirmar(null);
    }
  }

  async function reemplazar(doc: Doc, file: File) {
    setBusy(doc.id); setError(null);
    try {
      const supabase = getSupabase();
      const path = rutaStorage(projectId, doc.doc_type, file.name);

      const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
      if (upErr) throw new Error(`No se pudo subir el archivo: ${upErr.message}`);

      const res  = await fetch(`/api/projects/${projectId}/documents/${doc.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ fileName: file.name, filePath: path }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      await cargar();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo reemplazar el documento.");
    } finally {
      setBusy(null);
    }
  }

  const closeViewer = useCallback(() => {
    setViewer(null);
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, []);

  useEffect(() => {
    if (!viewer) return;
    window.history.pushState({ viewerOpen: true }, "");
    const onPop = () => closeViewer();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [viewer, closeViewer]);

  return (
    <>
      <div ref={panelRef} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-[#CC5200]" />
            <span className="font-semibold text-slate-700 text-sm">Documentos del proyecto</span>
            <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full">
              {documents.length}
            </span>
          </div>
          {open
            ? <ChevronUp className="w-4 h-4 text-slate-400" />
            : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {open && (
          <div className="border-t border-slate-100 divide-y divide-slate-50">
            {error && (
              <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 font-medium">{error}</p>
              </div>
            )}
            {!loaded ? (
              <p className="px-5 py-4 text-sm text-slate-400">Cargando documentos...</p>
            ) : documents.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-400">Sin documentos adjuntos.</p>
            ) : documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-[#CC5200]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {docLabel(doc.doc_type)}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{doc.file_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {manage && doc.canManage && (
                    busy === doc.id ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 px-3 py-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Procesando...
                      </span>
                    ) : confirmar === doc.id ? (
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">¿Eliminar?</span>
                        <button
                          onClick={() => eliminar(doc)}
                          className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Sí, eliminar
                        </button>
                        <button
                          onClick={() => setConfirmar(null)}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1.5"
                        >
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#CC5200] border border-slate-200 hover:border-[#CC5200] px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                          <RefreshCw className="w-3.5 h-3.5" /> Reemplazar
                          <input
                            type="file" className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              e.target.value = ""; // permite reintentar el mismo archivo
                              if (f) reemplazar(doc, f);
                            }}
                          />
                        </label>
                        <button
                          onClick={() => setConfirmar(doc.id)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar
                        </button>
                      </>
                    )
                  )}
                  {doc.url ? (
                    <>
                      <button
                        onClick={() => setViewer({ url: doc.url!, name: doc.file_name })}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#CC5200] border border-slate-200 hover:border-[#CC5200] px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Ver
                      </button>
                      <a
                        href={doc.url}
                        download={doc.file_name}
                        className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#CC5200] hover:bg-[#B34700] px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Descargar
                      </a>
                    </>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                      <AlertTriangle className="w-3.5 h-3.5" /> Archivo no disponible
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document viewer modal */}
      {viewer && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80" onClick={closeViewer}>
          <div
            className="flex items-center justify-between px-5 py-3 bg-[#1A1A1A] shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-[#CC5200]" />
              <span className="text-white text-sm font-semibold truncate max-w-[60vw]">{viewer.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={viewer.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Abrir en nueva pestaña
              </a>
              <button onClick={closeViewer} className="text-slate-400 hover:text-white transition-colors ml-2">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {viewer.name.toLowerCase().endsWith(".pdf") ? (
              <iframe src={viewer.url} className="w-full h-full border-0" title={viewer.name} />
            ) : (
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewer.url)}&embedded=true`}
                className="w-full h-full border-0 bg-white"
                title={viewer.name}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
