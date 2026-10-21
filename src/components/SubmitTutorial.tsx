"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check, FileText, Upload, Sparkles, Send, FileSearch, Zap, Clock,
  Pause, Play, MessageSquare, User, Mail,
} from "lucide-react";

/**
 * Tutorial animado de la portada: muestra, en una ventana simulada, los
 * cinco pasos del formulario de envío (/submit) y el seguimiento posterior.
 * Avanza solo; se puede pausar o saltar a un paso. Cada escena reinicia sus
 * animaciones CSS al cambiar `key`. Con "menos movimiento" en el sistema,
 * no avanza solo y las escenas se muestran en su estado final.
 */

type Paso = { titulo: string; corto: string; texto: string; icon: typeof FileText };

const PASOS: Paso[] = [
  { corto: "Información", titulo: "Completa la información", icon: User,
    texto: "Tus datos, el título y el tipo de proyecto. Si postulas a un concurso con fecha cercana, puedes pedir la vía rápida." },
  { corto: "Temática", titulo: "Elige la temática", icon: FileSearch,
    texto: "Selecciona el área de tu investigación: así se asignan los revisores más adecuados." },
  { corto: "Documentos", titulo: "Sube tus documentos", icon: Upload,
    texto: "Protocolo, consentimiento o asentimiento informado e instrumentos. Los obligatorios están marcados." },
  { corto: "Revisión IA", titulo: "Pre-revisión con IA", icon: Sparkles,
    texto: "Opcional y gratuita: revisa tu proyecto según los tres pilares éticos antes del envío formal." },
  { corto: "Confirmar", titulo: "Confirma y envía", icon: Send,
    texto: "Revisa el resumen y envía. Recibirás por correo tu código de seguimiento." },
  { corto: "Seguimiento", titulo: "Sigue tu revisión", icon: Clock,
    texto: "Con tu código ves el estado, la fecha estimada de respuesta y los mensajes de cada ronda." },
];

const DURACION_MS = 5200;

function usaMenosMovimiento(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export default function SubmitTutorial() {
  const [paso, setPaso] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Solo corre cuando está en pantalla, para que no avance sin que nadie lo vea.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (pausado || hover || !visible || usaMenosMovimiento()) return;
    const id = setTimeout(() => setPaso((p) => (p + 1) % PASOS.length), DURACION_MS);
    return () => clearTimeout(id);
  }, [paso, pausado, hover, visible]);

  const actual = PASOS[paso];
  const corriendo = !pausado && !hover && visible;

  return (
    <div ref={ref} className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-8 lg:gap-12 items-center">
      {/* Lista de pasos */}
      <div>
        <ol className="space-y-1.5">
          {PASOS.map((p, i) => {
            const activo = i === paso;
            const hecho = i < paso;
            return (
              <li key={p.corto}>
                <button
                  onClick={() => setPaso(i)}
                  aria-current={activo ? "step" : undefined}
                  className={`w-full text-left flex gap-4 rounded-2xl p-3.5 transition-all ${
                    activo ? "bg-white shadow-md shadow-slate-200/70 border border-slate-100" : "hover:bg-white/60 border border-transparent"
                  }`}
                >
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold transition-colors ${
                      activo ? "bg-uai-gold text-white" : hecho ? "bg-uai-navy text-uai-gold" : "bg-slate-200/70 text-slate-500"
                    }`}
                  >
                    {hecho ? <Check className="w-4 h-4" /> : i + 1}
                  </span>
                  <span className="min-w-0 pt-1">
                    <span className={`block font-bold text-sm ${activo ? "text-uai-navy" : "text-slate-500"}`}>{p.titulo}</span>
                    {activo && (
                      <span key={paso} className="tut-aparece block text-slate-500 text-sm leading-relaxed mt-1">{p.texto}</span>
                    )}
                    {activo && (
                      <span className="block h-0.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
                        <span
                          key={`${paso}-${corriendo}`}
                          className="tut-progreso block h-full bg-uai-gold rounded-full"
                          style={{ animationDuration: `${DURACION_MS}ms`, animationPlayState: corriendo ? "running" : "paused" }}
                        />
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <button
          onClick={() => setPausado((v) => !v)}
          className="mt-4 ml-3.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
        >
          {pausado ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          {pausado ? "Reanudar tutorial" : "Pausar tutorial"}
        </button>
      </div>

      {/* Ventana simulada */}
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="order-first lg:order-none bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-300/40 overflow-hidden"
        aria-label={`Ejemplo: ${actual.titulo}`}
        role="img"
      >
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          <span className="ml-3 flex-1 min-w-0 truncate text-[11px] text-slate-400 bg-white border border-slate-100 rounded-md px-3 py-1">
            {paso === 5 ? "Portal Comité de Ética · Seguimiento" : "Portal Comité de Ética · Enviar proyecto"}
          </span>
        </div>

        {paso < 5 && (
          <div className="flex items-center justify-center gap-1.5 px-5 pt-5">
            {PASOS.slice(0, 5).map((p, i) => (
              <span key={p.corto} className="flex items-center gap-1.5">
                <span
                  className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors duration-500 ${
                    i < paso ? "bg-uai-navy text-uai-gold" : i === paso ? "bg-uai-gold text-white" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {i < paso ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                {i < 4 && <span className={`w-4 sm:w-7 h-0.5 rounded-full ${i < paso ? "bg-uai-navy" : "bg-slate-100"}`} />}
              </span>
            ))}
          </div>
        )}

        <div key={paso} className="p-5 sm:p-6 h-[340px] overflow-hidden">
          {paso === 0 && <EscenaInformacion />}
          {paso === 1 && <EscenaTematica />}
          {paso === 2 && <EscenaDocumentos />}
          {paso === 3 && <EscenaIA />}
          {paso === 4 && <EscenaConfirmar />}
          {paso === 5 && <EscenaSeguimiento />}
        </div>
      </div>
    </div>
  );
}

// ── Escenas ────────────────────────────────────────────────────────────────

/** Texto que se escribe solo. `d` = retraso en segundos. */
function Escribe({ texto, d = 0 }: { texto: string; d?: number }) {
  return (
    <span
      className="tut-escribe inline-block overflow-hidden whitespace-nowrap align-bottom"
      style={{ animationDelay: `${d}s`, ["--tut-ch" as string]: `${texto.length}ch`, animationTimingFunction: `steps(${texto.length})` }}
    >
      {texto}
    </span>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-500 mb-1">{label}</p>
      <div className="h-9 rounded-lg border border-slate-200 bg-white px-3 flex items-center text-[13px] text-slate-700 font-mono overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  return <p className="font-bold text-uai-navy text-base mb-4">{children}</p>;
}

function EscenaInformacion() {
  return (
    <div>
      <Titulo>Información del proyecto</Titulo>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Nombre"><Escribe texto="Camila Soto" d={0.2} /></Campo>
          <Campo label="Correo"><Escribe texto="camila@uai.cl" d={0.9} /></Campo>
        </div>
        <Campo label="Título del proyecto"><Escribe texto="Regulación emocional en adolescentes" d={1.6} /></Campo>
        <div className="tut-aparece flex items-center gap-3 rounded-xl border-2 border-orange-200 bg-orange-50 p-3" style={{ animationDelay: "3.2s" }}>
          <span className="tut-marca w-5 h-5 rounded-md border-2 border-[#CC5200] flex items-center justify-center" style={{ animationDelay: "3.7s" }}>
            <Check className="w-3.5 h-3.5 text-white" />
          </span>
          <span className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-[#CC5200]" /> Solicitar revisión por vía rápida
          </span>
          <span className="ml-auto text-[11px] text-slate-500 hidden sm:inline">Concurso: 15 nov</span>
        </div>
      </div>
    </div>
  );
}

function EscenaTematica() {
  const temas = [
    ["🧠", "Clínica y Salud"], ["👥", "Social y Comunitaria"],
    ["🌱", "Desarrollo"], ["⚡", "Cognitiva"],
    ["🔬", "Neurociencias"], ["📚", "Educacional"],
  ];
  return (
    <div>
      <Titulo>Temática de investigación</Titulo>
      <div className="grid grid-cols-2 gap-2.5">
        {temas.map(([e, t], i) => (
          <div
            key={t}
            className={`tut-aparece rounded-xl border-2 p-3 text-[13px] font-semibold flex items-center gap-2 ${i === 2 ? "tut-elige" : "border-slate-200 text-slate-600"}`}
            style={{ animationDelay: `${0.1 + i * 0.12}s` }}
          >
            <span>{e}</span> {t}
          </div>
        ))}
      </div>
      <p className="tut-aparece text-[12px] text-slate-500 mt-4 flex items-center gap-1.5" style={{ animationDelay: "2.4s" }}>
        <Check className="w-3.5 h-3.5 text-emerald-600" /> Se asignarán revisores del área
      </p>
    </div>
  );
}

function EscenaDocumentos() {
  const docs = [
    ["Protocolo de investigación", "protocolo.pdf", true],
    ["Consentimiento informado", "consentimiento.docx", true],
    ["Instrumentos", "escalas.pdf", false],
  ] as const;
  return (
    <div>
      <Titulo>Documentos requeridos</Titulo>
      <div className="space-y-2.5">
        {docs.map(([nombre, archivo, oblig], i) => (
          <div key={nombre} className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-slate-700 truncate">
                  {nombre} {oblig && <span className="text-red-400">*</span>}
                </span>
                <span className="tut-aparece block text-[11px] text-slate-400" style={{ animationDelay: `${0.4 + i * 0.9}s` }}>{archivo}</span>
              </span>
              <span className="tut-marca w-6 h-6 rounded-full flex items-center justify-center" style={{ animationDelay: `${1.3 + i * 0.9}s` }}>
                <Check className="w-3.5 h-3.5 text-white" />
              </span>
            </div>
            <div className="h-1 bg-slate-100 rounded-full mt-2.5 overflow-hidden">
              <div className="tut-carga h-full bg-blue-500 rounded-full" style={{ animationDelay: `${0.4 + i * 0.9}s` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EscenaIA() {
  const pilares = [
    ["Autonomía", "bg-blue-500", "92%"],
    ["Beneficencia", "bg-amber-500", "78%"],
    ["Justicia", "bg-emerald-500", "85%"],
  ];
  return (
    <div>
      <Titulo>
        <span className="inline-flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-600" /> Revisión ética con IA
        </span>
      </Titulo>
      <div className="space-y-3">
        {pilares.map(([n, c, w], i) => (
          <div key={n}>
            <div className="flex justify-between text-[12px] font-semibold text-slate-600 mb-1">
              <span>{n}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className={`tut-barra h-full ${c} rounded-full`} style={{ ["--tut-w" as string]: w, animationDelay: `${0.3 + i * 0.4}s` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="tut-aparece mt-5 rounded-xl bg-violet-50 border border-violet-100 p-3.5" style={{ animationDelay: "2.2s" }}>
        <p className="text-[12px] font-bold text-violet-700 mb-1">Sugerencia</p>
        <p className="text-[12px] text-slate-600 leading-relaxed">
          Describe cómo se mitigará el malestar que podría generar el cuestionario y agrégalo al consentimiento.
        </p>
      </div>
    </div>
  );
}

function EscenaConfirmar() {
  return (
    <div className="relative h-full">
      <Titulo>Confirmar y enviar</Titulo>
      <div className="space-y-2.5">
        <div className="rounded-xl bg-slate-50 p-3.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Proyecto</p>
          <p className="text-[13px] font-semibold text-slate-800">Regulación emocional en adolescentes</p>
          <p className="text-[12px] text-slate-500">Desarrollo · 3 documentos</p>
        </div>
        <div className="flex justify-end pt-1">
          <span className="tut-presiona inline-flex items-center gap-2 bg-uai-gold text-white text-[13px] font-bold px-5 py-2.5 rounded-xl">
            <Send className="w-4 h-4" /> Enviar al comité
          </span>
        </div>
      </div>
      <div className="tut-exito absolute inset-0 bg-white flex flex-col items-center justify-center text-center">
        <span className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
          <Check className="w-7 h-7 text-emerald-600" />
        </span>
        <p className="font-bold text-uai-navy">¡Proyecto enviado!</p>
        <p className="text-[12px] text-slate-500 mt-1 flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5" /> Tu código de seguimiento llegó a tu correo
        </p>
        <p className="mt-3 font-mono text-sm font-bold tracking-wider text-uai-gold bg-orange-50 border border-orange-100 rounded-lg px-4 py-1.5">
          CE-2026-0142
        </p>
      </div>
    </div>
  );
}

function EscenaSeguimiento() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="font-bold text-uai-navy text-base">Regulación emocional…</p>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">En revisión</span>
      </div>
      <div className="tut-aparece flex items-start gap-2.5 rounded-xl bg-slate-50 border border-slate-100 p-3 mb-3" style={{ animationDelay: "0.2s" }}>
        <Clock className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-[12px] font-bold text-slate-700">Fecha estimada de respuesta: 12 de noviembre</p>
          <p className="text-[11px] text-slate-500">3 semanas por ronda de revisión</p>
        </div>
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
        <MessageSquare className="w-3 h-3" /> Mensajes · Ronda 1
      </p>
      <div className="space-y-2">
        <div className="tut-aparece max-w-[85%] rounded-xl rounded-tl-sm bg-orange-50 border border-orange-100 p-2.5" style={{ animationDelay: "1s" }}>
          <p className="text-[10px] font-bold text-[#CC5200] mb-0.5">Revisor 1 · Revisión</p>
          <p className="text-[12px] text-slate-600">Por favor precisa el resguardo de los datos.</p>
        </div>
        <div className="tut-aparece max-w-[85%] ml-auto rounded-xl rounded-tr-sm bg-white border border-slate-200 p-2.5" style={{ animationDelay: "2.1s" }}>
          <p className="text-[10px] font-bold text-slate-500 mb-0.5">Tú · Respuesta</p>
          <p className="text-[12px] text-slate-600">Listo, lo agregué en la sección de datos.</p>
        </div>
      </div>
      <div className="tut-aparece mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-100 rounded-lg px-2.5 py-1.5" style={{ animationDelay: "3s" }}>
        <FileSearch className="w-3.5 h-3.5" /> Consultar estado de revisión
      </div>
    </div>
  );
}
