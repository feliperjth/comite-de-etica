"use client";

import { useState } from "react";
import { Upload, CheckCircle, Loader2, FileText, X, Check, Plus } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { safeStorageName } from "@/lib/storage";
import { TIPOS_REENVIO, TIPO_ADICIONAL, docLabel } from "@/lib/documents";

/**
 * `reenvio`   — el proyecto está con observaciones: se responde a los revisores
 *               y eso abre una ronda nueva.
 * `completar` — la ronda nueva ya está abierta y nadie ha evaluado todavía: se
 *               añade lo que faltó, sin mover el proyecto de ronda.
 */
type Modo = "reenvio" | "completar";

interface Props {
  projectId: string;
  /** Código de seguimiento: autoriza el registro cuando no hay sesión. */
  code: string;
  currentRound: number;
  modo: Modo;
}

/** Un archivo listo para subir, ya con su tipo y su ruta de Storage. */
type Pendiente = { docType: string; file: File; path: string };

export default function ResubmitForm({ projectId, code, currentRound, modo }: Props) {
  // Una casilla por categoría, más una lista libre para lo adicional.
  const [porTipo, setPorTipo]   = useState<Record<string, File>>({});
  const [extras, setExtras]     = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progreso, setProgreso] = useState({ hechos: 0, total: 0 });
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState("");

  const completando = modo === "completar";
  // Al reenviar se abre la ronda siguiente; al completar se escribe en la que
  // ya está abierta, que es donde el revisor va a mirar.
  const ronda = completando ? currentRound : currentRound + 1;
  const total = Object.keys(porTipo).length + extras.length;

  /**
   * La ronda vive en la ruta de Storage (`rondaDeDocumento` la lee de ahí), así
   * que el tipo va DENTRO de la carpeta de la ronda y no al revés. Si se
   * subiera a `{proyecto}/protocol/...`, como en el envío inicial, la
   * corrección se mezclaría con el original y el expediente la daría por
   * ronda 1.
   */
  function armarPendientes(): Pendiente[] {
    const base = `${projectId}/revision-${ronda}`;
    // Completando ya hay archivos en esta carpeta: si el añadido se llama igual
    // que uno de ellos, `upsert` lo sobrescribiría en silencio. El sello de
    // tiempo hace que se sume en vez de sustituir.
    const sello = completando ? `${Date.now()}_` : "";
    const lista: Pendiente[] = [];

    for (const tipo of TIPOS_REENVIO) {
      const file = porTipo[tipo];
      if (file) lista.push({ docType: tipo, file, path: `${base}/${tipo}/${sello}${safeStorageName(file.name)}` });
    }
    // Van numerados: dos adjuntos distintos pueden llamarse igual y, con
    // `upsert`, el segundo borraría al primero.
    extras.forEach((file, i) => {
      lista.push({
        docType: TIPO_ADICIONAL,
        file,
        path: `${base}/${TIPO_ADICIONAL}/${sello}${i + 1}_${safeStorageName(file.name)}`,
      });
    });
    return lista;
  }

  async function handleUpload() {
    const pendientes = armarPendientes();
    if (pendientes.length === 0) return;

    setUploading(true);
    setError("");
    setProgreso({ hechos: 0, total: pendientes.length });

    try {
      const supabase = getSupabase();

      for (const { docType, file, path } of pendientes) {
        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(path, file, { upsert: true });
        if (uploadError) throw new Error(`No se pudo subir "${file.name}": ${uploadError.message}`);

        // Registro por el servidor: `documents` ya no es escribible desde el
        // navegador. Va el código de seguimiento porque a /track se llega con el
        // enlace del correo, sin iniciar sesión: la mayoría de investigadores no
        // tiene cuenta, y sin `code` el registro respondía 403 y el archivo
        // quedaba en Storage sin entrar al expediente.
        const res = await fetch(`/api/projects/${projectId}/documents`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doc_type: docType, file_name: file.name, file_path: path, code }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error ?? `No se pudo registrar "${file.name}".`);
        }

        setProgreso((p) => ({ ...p, hechos: p.hechos + 1 }));
      }

      // Una sola vez, al final: cierra la ronda y avisa a los revisores. Si
      // fuera por archivo, cada uno dispararía su propia tanda de correos.
      // Mismo código: este endpoint también autoriza por sesión o por código.
      // Completando solo avisa: la ronda ya está abierta y no debe avanzar.
      await fetch(`/api/projects/${projectId}/resubmit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ round: currentRound, code, soloAviso: completando }),
      });

      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al subir los archivos.");
    } finally {
      setUploading(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
        <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
        <div>
          <p className="font-semibold text-emerald-700 text-sm">
            {progreso.total === 1
              ? "Documento enviado exitosamente"
              : `${progreso.total} documentos enviados exitosamente`}
          </p>
          <p className="text-emerald-600 text-xs mt-0.5">
            {completando
              ? "Se añadió a tu reenvío y los revisores fueron avisados. Recarga la página para verlo en el expediente."
              : "Los revisores fueron notificados y realizarán una nueva evaluación."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6">
      <p className="text-sm font-bold text-[#CC5200] uppercase tracking-wide mb-1">
        {completando ? "¿Olvidaste algún documento?" : "Subir documentos corregidos"}
      </p>
      <p className="text-slate-500 text-xs mb-4 leading-relaxed">
        {completando ? (
          <>
            Tus correcciones ya están enviadas y ningún revisor ha empezado a evaluarlas todavía,
            así que aún puedes añadir lo que falte. Se sumará al mismo reenvío, sin abrir una ronda
            nueva. Esta opción se cierra en cuanto llegue la primera evaluación.
          </>
        ) : (
          <>
            Incorpora las correcciones solicitadas y sube los documentos actualizados.
            Sube solo los que hayas modificado; puedes añadir todos los que necesites.
            Ambos revisores serán notificados automáticamente.
          </>
        )}
      </p>

      <div className="space-y-2.5 mb-4">
        {TIPOS_REENVIO.map((tipo) => {
          const file = porTipo[tipo];
          return (
            <div
              key={tipo}
              className={`border rounded-xl p-3.5 transition-all ${
                file ? "border-emerald-200 bg-emerald-50" : "border-orange-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    file ? "bg-emerald-100" : "bg-orange-100"
                  }`}>
                    {file
                      ? <Check className="w-4 h-4 text-emerald-600" />
                      : <Upload className="w-4 h-4 text-orange-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700">{docLabel(tipo)}</p>
                    {file && <p className="text-xs text-emerald-600 truncate">{file.name}</p>}
                  </div>
                </div>

                {file ? (
                  <button
                    onClick={() => setPorTipo((p) => {
                      const resto = { ...p };
                      delete resto[tipo];
                      return resto;
                    })}
                    disabled={uploading}
                    className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
                    aria-label={`Quitar ${docLabel(tipo)}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <label className="text-xs font-semibold text-[#CC5200] hover:underline cursor-pointer shrink-0">
                    Seleccionar
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setPorTipo((p) => ({ ...p, [tipo]: f }));
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Casilla libre: lo que no cabe en las categorías fijas */}
      <div className="border border-dashed border-orange-300 rounded-xl p-3.5 mb-4">
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="text-sm font-medium text-slate-700">Otros documentos</p>
          <label className="flex items-center gap-1 text-xs font-semibold text-[#CC5200] hover:underline cursor-pointer shrink-0">
            <Plus className="w-3.5 h-3.5" /> Añadir
            <input
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              disabled={uploading}
              onChange={(e) => {
                const nuevos = Array.from(e.target.files ?? []);
                if (nuevos.length) setExtras((p) => [...p, ...nuevos]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Carta de respuesta a los revisores, autorizaciones, anexos nuevos… Puedes seleccionar varios a la vez.
        </p>

        {extras.length > 0 && (
          <div className="space-y-1.5 mt-3">
            {extras.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center justify-between gap-2 bg-white border border-orange-200 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-[#CC5200] shrink-0" />
                  <span className="text-xs text-slate-600 truncate">{file.name}</span>
                </div>
                <button
                  onClick={() => setExtras((p) => p.filter((_, j) => j !== i))}
                  disabled={uploading}
                  className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
                  aria-label={`Quitar ${file.name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-red-600 text-xs mb-3">{error}</p>}

      <button
        onClick={handleUpload}
        disabled={uploading || total === 0}
        className="w-full flex items-center justify-center gap-2 bg-[#CC5200] hover:bg-[#B34700] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors text-sm"
      >
        {uploading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando… ({progreso.hechos}/{progreso.total})</>
          : <><Upload className="w-4 h-4" /> {completando ? "Añadir al reenvío" : "Enviar correcciones"}{total > 0 && ` (${total})`}</>}
      </button>

      {total === 0 && (
        <p className="text-xs text-slate-400 text-center mt-2">Selecciona al menos un documento.</p>
      )}
    </div>
  );
}
