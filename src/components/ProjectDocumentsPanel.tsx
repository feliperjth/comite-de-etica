"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  FileText, ChevronDown, ChevronUp, Eye, Download, X, ExternalLink, AlertTriangle,
} from "lucide-react";

const docLabels: Record<string, string> = {
  protocol:    "Protocolo de investigación",
  consent:     "Consentimiento informado",
  assent:      "Asentimiento informado",
  instruments: "Instrumentos / tests a utilizar",
  revision:    "Documento corregido (reenvío)",
};

type Doc = { id: string; doc_type: string; file_name: string; url: string | null };

/**
 * Collapsible panel listing every document the researcher uploaded for a
 * project, with in-app viewer and download. Used in all reviewer flows
 * (individual, download, group) so documents are always accessible.
 */
export default function ProjectDocumentsPanel({ projectId }: { projectId: string }) {
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [loaded, setLoaded]       = useState(false);
  const [open, setOpen]           = useState(true);
  const [viewer, setViewer]       = useState<{ url: string; name: string } | null>(null);
  const panelRef                  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${projectId}/documents`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) setDocuments(d.documents ?? []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [projectId]);

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
                      {docLabels[doc.doc_type] ?? doc.doc_type}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{doc.file_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
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
