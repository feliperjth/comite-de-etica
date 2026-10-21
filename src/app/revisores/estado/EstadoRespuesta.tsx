"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Loader2, MessageSquare, Send, AlertCircle } from "lucide-react";

type Info = {
  title: string;
  round: number;
  reviewer: string;
  alreadyAnswered: boolean;
  options: { key: string; label: string; texto: string }[];
};

export default function EstadoRespuesta({ token, preseleccion }: { token: string; preseleccion: string }) {
  const [info, setInfo]       = useState<Info | null>(null);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(true);
  const [elegida, setElegida] = useState<string>(preseleccion);
  const [libre, setLibre]     = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo]     = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/status-reply?t=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const d = await res.json().catch(() => ({}));
        if (!vivo) return;
        if (res.ok) setInfo(d);
        else setError(d.error ?? "No se pudo abrir la consulta.");
      })
      .catch(() => vivo && setError("No se pudo abrir la consulta."))
      .finally(() => vivo && setLoading(false));
    return () => { vivo = false; };
  }, [token]);

  async function enviar() {
    setEnviando(true);
    setError("");
    const res = await fetch("/api/status-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(elegida === "libre" ? { t: token, text: libre } : { t: token, key: elegida }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) setListo(true);
    else setError(d.error ?? "No se pudo enviar la respuesta.");
    setEnviando(false);
  }

  const puedeEnviar = elegida === "libre" ? libre.trim().length > 0 : !!info?.options.some((o) => o.key === elegida);

  return (
    <div className="min-h-[70vh] bg-slate-50 px-4 py-14">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <p className="text-xs font-bold text-[#CC5200] uppercase tracking-widest mb-2">Consulta de estado de revisión</p>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Responder al investigador/a</h1>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-7">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
          ) : listo ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="font-bold text-lg text-[#1A1A1A] mb-2">Respuesta enviada</h2>
              <p className="text-sm text-slate-500">El investigador/a recibirá tu respuesta por correo y la verá en su portal. Ya puedes cerrar esta página.</p>
            </div>
          ) : !info ? (
            <div className="flex items-start gap-3 text-red-600 bg-red-50 border border-red-100 rounded-2xl p-4">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error || "No se pudo abrir la consulta."}</p>
            </div>
          ) : info.alreadyAnswered ? (
            <div className="text-center py-4">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
              <h2 className="font-bold text-[#1A1A1A] mb-2">Ya respondiste esta consulta</h2>
              <p className="text-sm text-slate-500">Si quieres agregar algo, escríbelo desde la sección de mensajes del portal de revisión.</p>
            </div>
          ) : (
            <>
              <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 mb-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Proyecto · Ronda {info.round}</p>
                <p className="font-semibold text-slate-800 text-sm leading-snug">{info.title}</p>
                <p className="text-xs text-slate-400 mt-1.5">Respondes como {info.reviewer}. El investigador/a te verá como Revisor 1 o Revisor 2.</p>
              </div>

              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Elige tu respuesta</p>
              <div className="space-y-2 mb-4">
                {info.options.map((o) => (
                  <label key={o.key} className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    elegida === o.key ? "border-[#CC5200] bg-orange-50/50" : "border-slate-100 hover:border-slate-200"
                  }`}>
                    <input type="radio" name="resp" checked={elegida === o.key} onChange={() => setElegida(o.key)}
                      className="mt-1 accent-[#CC5200]" />
                    <span>
                      <span className="block text-sm font-bold text-slate-800">{o.label}</span>
                      <span className="block text-xs text-slate-500 mt-0.5">{o.texto.replace(/^Estado de la revisión:\s*/, "")}</span>
                    </span>
                  </label>
                ))}
                <label className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  elegida === "libre" ? "border-[#CC5200] bg-orange-50/50" : "border-slate-100 hover:border-slate-200"
                }`}>
                  <input type="radio" name="resp" checked={elegida === "libre"} onChange={() => setElegida("libre")}
                    className="mt-1 accent-[#CC5200]" />
                  <span className="flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                      <MessageSquare className="w-3.5 h-3.5" /> Escribir mi propia respuesta
                    </span>
                    {elegida === "libre" && (
                      <textarea value={libre} onChange={(e) => setLibre(e.target.value)} rows={4} maxLength={2000}
                        placeholder="Por ejemplo: estoy revisando los anexos y envío mi evaluación el viernes."
                        className="mt-2 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#CC5200] resize-none" />
                    )}
                  </span>
                </label>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-4">{error}</p>}

              <button onClick={enviar} disabled={!puedeEnviar || enviando}
                className="w-full flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-black disabled:opacity-40 text-white font-bold py-3.5 rounded-2xl transition-colors text-sm">
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar respuesta
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
