"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  FileText, ChevronDown, ChevronUp, Eye, Download, X, ExternalLink, AlertTriangle,
  Trash2, RefreshCw, Loader2, User, Users, Mail, CheckCircle,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { safeStorageName } from "@/lib/storage";
import { docLabel, formatFechaDoc } from "@/lib/documents";
import { etiquetaRonda, type GrupoDocumento } from "@/lib/documentRounds";

type Doc = {
  id: string;
  doc_type: string;
  file_name: string;
  file_path: string | null;
  url: string | null;
  /** Cuándo se subió. Null en los documentos que no la tienen registrada. */
  created_at?: string | null;
  /** Quién lo aportó, y a qué ronda pertenece. Lo resuelve el servidor. */
  grupo: GrupoDocumento;
  ronda: number;
  /** Reemplazarlo dispara un correo al investigador/a. */
  avisaAlInvestigador?: boolean;
  canManage?: boolean;
  bloqueo?: string | null;
};

/**
 * Ruta del archivo de reemplazo en Storage. Fuera del componente a propósito:
 * `Date.now()` es impuro y React no admite llamarlo durante el render.
 * El sufijo temporal evita chocar con el archivo al que sustituye.
 *
 * Va en la MISMA carpeta que el original porque la ronda de un documento se
 * deduce de su ruta: sacarlo de ahí lo cambiaría de ronda. El servidor lo
 * vuelve a comprobar y rechaza el reemplazo si no coincide.
 */
function rutaReemplazo(projectId: string, doc: Doc, fileName: string): string {
  const corte   = doc.file_path?.lastIndexOf("/") ?? -1;
  const carpeta = corte > 0 ? doc.file_path!.slice(0, corte) : `${projectId}/${doc.doc_type}`;
  return `${carpeta}/${Date.now()}_${safeStorageName(fileName)}`;
}

/** "· Subido el 4 ago 2026, 16:06". Nada si el documento no la tiene. */
function FechaSubida({ iso }: { iso?: string | null }) {
  const fecha = formatFechaDoc(iso);
  if (!fecha) return null;
  return <span className="shrink-0 whitespace-nowrap">· Subido el {fecha}</span>;
}

type BloqueAutor = { grupo: GrupoDocumento; docs: Doc[] };
type BloqueRonda = { ronda: number; autores: BloqueAutor[] };

/**
 * Agrupa por RONDA y, dentro de cada una, por autor.
 *
 * La ronda manda porque así se lee la historia del proyecto: qué mandó el
 * investigador, qué le respondieron los revisores, qué corrigió después.
 * Agrupando primero por autor, las observaciones de la ronda 1 quedaban lejos
 * de los documentos que las motivaron y había que ir saltando de un bloque a
 * otro para saber qué contestaba a qué.
 *
 * Dentro de la ronda va primero el investigador: primero lo que se evalúa y
 * luego lo que se dijo de ello. El orden dentro de cada autor es el que ya
 * trae el servidor (orden canónico del expediente).
 */
function agrupar(docs: Doc[]): BloqueRonda[] {
  const rondas: BloqueRonda[] = [];
  for (const doc of docs) {
    let r = rondas.find((x) => x.ronda === doc.ronda);
    if (!r) { r = { ronda: doc.ronda, autores: [] }; rondas.push(r); }
    let a = r.autores.find((x) => x.grupo === doc.grupo);
    if (!a) { a = { grupo: doc.grupo, docs: [] }; r.autores.push(a); }
    a.docs.push(doc);
  }
  rondas.sort((a, b) => a.ronda - b.ronda);
  const peso = (g: GrupoDocumento) => (g === "investigador" ? 0 : 1);
  for (const r of rondas) r.autores.sort((a, b) => peso(a.grupo) - peso(b.grupo));
  return rondas;
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
  /** Reemplazo de un documento que avisa al investigador, a la espera del OK. */
  const [pendiente, setPendiente] = useState<{ doc: Doc; file: File } | null>(null);
  /** Resultado del último reemplazo, para confirmar si salió el correo. */
  const [aviso, setAviso]         = useState<{ ok: boolean; texto: string } | null>(null);
  /** Rondas recogidas. Las anteriores a la última arrancan así. */
  const [plegadas, setPlegadas]   = useState<Set<number>>(new Set());
  const panelRef                  = useRef<HTMLDivElement>(null);
  /** El plegado inicial se calcula una sola vez: recargar no debe recogerlo
   *  todo otra vez y deshacer lo que quien revisa acaba de abrir. */
  const plegadoInicial            = useRef(false);

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

  /** Los que avisan al investigador pasan antes por una confirmación. */
  function elegirArchivo(doc: Doc, file: File) {
    setAviso(null);
    if (doc.avisaAlInvestigador) setPendiente({ doc, file });
    else reemplazar(doc, file);
  }

  async function reemplazar(doc: Doc, file: File) {
    setBusy(doc.id); setError(null); setPendiente(null);
    try {
      const supabase = getSupabase();
      const path = rutaReemplazo(projectId, doc, file.name);

      const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
      if (upErr) throw new Error(`No se pudo subir el archivo: ${upErr.message}`);

      const res  = await fetch(`/api/projects/${projectId}/documents/${doc.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ fileName: file.name, filePath: path }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);

      // El documento ya se sustituyó; el correo puede haber fallado aparte.
      if (data.avisado) {
        setAviso({ ok: true, texto: `Documento reemplazado. Se avisó por correo a ${data.avisado}.` });
      } else if (data.avisoError) {
        setAviso({ ok: false, texto: `Documento reemplazado, pero el aviso al investigador/a no salió: ${data.avisoError}` });
      } else {
        setAviso({ ok: true, texto: "Documento reemplazado." });
      }
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

  const bloques = agrupar(documents);
  // La ronda más reciente con documentos: la que se está revisando ahora.
  const ultimaRonda = bloques.length ? bloques[bloques.length - 1].ronda : 1;

  // Al cargar, solo queda abierta la última ronda; las anteriores son historia
  // y en un proyecto con tres o cuatro llenaban la pantalla.
  useEffect(() => {
    if (plegadoInicial.current || !loaded || documents.length === 0) return;
    plegadoInicial.current = true;
    const rondas = [...new Set(documents.map((d) => d.ronda))];
    const actual = Math.max(...rondas);
    setPlegadas(new Set(rondas.filter((r) => r !== actual)));
  }, [loaded, documents]);

  function alternarRonda(ronda: number) {
    setPlegadas((p) => {
      const siguiente = new Set(p);
      if (!siguiente.delete(ronda)) siguiente.add(ronda);
      return siguiente;
    });
  }

  /** Una fila de documento, con sus acciones. */
  const fila = (doc: Doc) => (
    <div key={doc.id} className="px-5 py-3 hover:bg-slate-50/50">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-[#CC5200]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">
              {docLabel(doc.doc_type)}
            </p>
            {/* El nombre cede el espacio; la fecha no se recorta nunca. */}
            <p className="text-xs text-slate-400 flex items-center gap-1.5 min-w-0">
              <span className="truncate">{doc.file_name}</span>
              <FechaSubida iso={doc.created_at} />
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
            ) : pendiente?.doc.id === doc.id ? null : (
              <>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#CC5200] border border-slate-200 hover:border-[#CC5200] px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                  <RefreshCw className="w-3.5 h-3.5" /> Reemplazar
                  <input
                    type="file" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = ""; // permite reintentar el mismo archivo
                      if (f) elegirArchivo(doc, f);
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

      {/* Reemplazo que avisa al investigador: se confirma antes de subir nada,
          para que quien revisa sepa que saldrá el correo. */}
      {pendiente?.doc.id === doc.id && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="flex items-start gap-2.5">
            <Mail className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-800 mb-1">
                Se notificará al investigador/a
              </p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Este documento ya está en su expediente. Al reemplazarlo por{" "}
                <strong className="break-all">{pendiente.file.name}</strong> se le enviará
                un correo avisando de que la versión anterior ya no es válida.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 pl-7">
            <button
              onClick={() => reemplazar(pendiente.doc, pendiente.file)}
              className="text-xs font-semibold text-white bg-[#CC5200] hover:bg-[#B34700] px-3 py-1.5 rounded-lg transition-colors"
            >
              Reemplazar y avisar
            </button>
            <button
              onClick={() => setPendiente(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1.5"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );

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
          <div className="border-t border-slate-100">
            {error && (
              <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 font-medium">{error}</p>
              </div>
            )}
            {aviso && (
              <div className={`px-5 py-3 border-b flex items-start gap-2 ${
                aviso.ok ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"
              }`}>
                {aviso.ok
                  ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
                <p className={`text-xs font-medium ${aviso.ok ? "text-emerald-700" : "text-amber-700"}`}>
                  {aviso.texto}
                </p>
              </div>
            )}
            {!loaded ? (
              <p className="px-5 py-4 text-sm text-slate-400">Cargando documentos...</p>
            ) : documents.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-400">Sin documentos adjuntos.</p>
            ) : bloques.map((bloque) => {
              const plegada = plegadas.has(bloque.ronda);
              const total   = bloque.autores.reduce((n, a) => n + a.docs.length, 0);
              const esUltima = bloque.ronda === ultimaRonda;
              const sinRevisores = !bloque.autores.some((a) => a.grupo === "revisor");
              return (
                <div key={bloque.ronda} className="border-b border-slate-100 last:border-b-0">
                  <button
                    onClick={() => alternarRonda(bloque.ronda)}
                    className="w-full flex items-center justify-between gap-3 px-5 py-2.5 bg-slate-50/80 border-b border-slate-100 hover:bg-slate-100/70 transition-colors"
                  >
                    <span className="text-xs font-bold text-[#CC5200] uppercase tracking-wide">
                      {etiquetaRonda(bloque.ronda)}
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="bg-white border border-slate-200 text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full">
                        {total}
                      </span>
                      {plegada
                        ? <ChevronDown className="w-4 h-4 text-slate-400" />
                        : <ChevronUp className="w-4 h-4 text-slate-400" />}
                    </span>
                  </button>

                  {!plegada && (
                    <>
                      {bloque.autores.map((autor) => {
                        const esRevisor = autor.grupo === "revisor";
                        return (
                          <div key={autor.grupo}>
                            <p className="flex items-center gap-1.5 px-5 pt-3 pb-1 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                              {esRevisor
                                ? <Users className="w-3.5 h-3.5" />
                                : <User className="w-3.5 h-3.5" />}
                              {esRevisor ? "Enviados por los revisores" : "Enviados por el investigador/a"}
                            </p>
                            <div className="divide-y divide-slate-50">{autor.docs.map(fila)}</div>
                          </div>
                        );
                      })}
                      {/* Solo en la ronda en curso: en una cerrada, que no haya
                          documento de comentarios no significa que falten. */}
                      {esUltima && sinRevisores && (
                        <p className="px-5 py-3 text-xs text-slate-400">
                          Sin comentarios de revisión todavía.
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
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
