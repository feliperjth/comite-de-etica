"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  MessageSquare, Send, Loader2, ChevronDown, ChevronUp,
  FileUp, CheckCircle, AlertCircle,
} from "lucide-react";

type SenderType = "investigador" | "revisor1" | "revisor2";

interface Message {
  id: string;
  sender_type: SenderType;
  body: string;
  created_at: string;
  round: number;
}

type Evento =
  | { kind: "submitted"; round: number; at: string }
  | { kind: "resubmitted"; round: number; at: string }
  | {
      kind: "review";
      round: number;
      at: string;
      who: "revisor1" | "revisor2" | "coordinacion";
      decision: "accepted" | "corrections";
    };

type Item =
  | { tipo: "mensaje"; at: string; m: Message }
  | { tipo: "evento"; at: string; e: Evento };

interface Props {
  projectId: string;
  role: "investigador" | "reviewer";
}

const ORDINALES = ["", "Primera", "Segunda", "Tercera", "Cuarta", "Quinta", "Sexta"];
const tituloRonda = (n: number) => (ORDINALES[n] ? `${ORDINALES[n]} ronda` : `Ronda ${n}`);

function quien(type: SenderType | "coordinacion", role: Props["role"]): string {
  if (type === "coordinacion") return "Coordinación del Comité";
  if (type === "investigador") return role === "investigador" ? "Tú" : "Investigador/a";
  return type === "revisor1" ? "Revisor 1" : "Revisor 2";
}

function isOwnMessage(type: SenderType, role: Props["role"]) {
  if (role === "investigador") return type === "investigador";
  return type === "revisor1" || type === "revisor2";
}

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

/** Hito de la ronda (envío, reenvío, evaluación), centrado entre los mensajes. */
function EventoFila({ e, role }: { e: Evento; role: Props["role"] }) {
  let icon = <FileUp className="w-3.5 h-3.5" />;
  let texto = "";
  let cls = "bg-slate-50 text-slate-500 border-slate-200";

  if (e.kind === "submitted") {
    texto = role === "investigador" ? "Enviaste el proyecto al comité" : "El investigador/a envió el proyecto";
  } else if (e.kind === "resubmitted") {
    texto = role === "investigador"
      ? `Enviaste tus correcciones · comienza la ${tituloRonda(e.round).toLowerCase()}`
      : `El investigador/a envió sus correcciones · comienza la ${tituloRonda(e.round).toLowerCase()}`;
  } else {
    const aprobo = e.decision === "accepted";
    icon = aprobo ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />;
    cls = aprobo
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-orange-50 text-[#CC5200] border-orange-200";
    texto = `${quien(e.who, role)} envió su evaluación · ${aprobo ? "Aprobó" : "Pidió correcciones"}`;
  }

  return (
    <div className="flex justify-center">
      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full border ${cls}`}>
        {icon} {texto}
        <span className="font-normal opacity-70">· {fecha(e.at)}</span>
      </span>
    </div>
  );
}

function MensajeBurbuja({ m, role }: { m: Message; role: Props["role"] }) {
  const own = isOwnMessage(m.sender_type, role);
  const esRevision = m.sender_type !== "investigador";
  return (
    <div className={`flex ${own ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[82%] rounded-2xl px-4 py-3 ${
        own ? "bg-[#1A1A1A] text-white" : "bg-slate-100 text-slate-700"
      }`}>
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className={`text-[10px] font-bold uppercase tracking-wide ${own ? "text-[#CC5200]" : "text-slate-500"}`}>
            {quien(m.sender_type, role)}
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
            esRevision
              ? own ? "bg-[#CC5200]/20 text-orange-200" : "bg-orange-100 text-[#CC5200]"
              : own ? "bg-sky-400/20 text-sky-200" : "bg-sky-100 text-sky-700"
          }`}>
            {esRevision ? "Revisión" : "Respuesta"}
          </span>
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
        <p className={`text-[10px] mt-2 ${own ? "text-slate-500" : "text-slate-400"}`}>{fecha(m.created_at)}</p>
      </div>
    </div>
  );
}

export default function ProjectMessages({ projectId, role }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [events, setEvents]     = useState<Evento[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState("");
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState("");
  /** Rondas desplegadas. Por defecto solo la actual. */
  const [abiertas, setAbiertas] = useState<Set<number> | null>(null);
  /** Lista de la ronda actual: se desplaza ella sola, no la página. */
  const listaActualRef          = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/messages`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? []);
      setEvents(data.events ?? []);
      setCurrentRound(data.currentRound ?? 1);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  useEffect(() => {
    const el = listaActualRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, abiertas]);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    setError("");
    const res = await fetch(`/api/projects/${projectId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text.trim() }),
    });
    if (res.ok) {
      setText("");
      await loadMessages();
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al enviar el mensaje");
    }
    setSending(false);
  }

  const abiertasEfectivas = abiertas ?? new Set([currentRound]);
  function toggle(n: number) {
    const next = new Set(abiertasEfectivas);
    if (next.has(n)) next.delete(n); else next.add(n);
    setAbiertas(next);
  }

  // Una sección por ronda, de la primera a la actual, con mensajes e hitos
  // en orden cronológico.
  const rondas = Array.from({ length: currentRound }, (_, i) => i + 1).map((n) => {
    const items: Item[] = [
      ...messages.filter((m) => m.round === n).map((m) => ({ tipo: "mensaje" as const, at: m.created_at, m })),
      ...events.filter((e) => e.round === n).map((e) => ({ tipo: "evento" as const, at: e.at, e })),
    ].sort((a, b) => {
      const d = Date.parse(a.at) - Date.parse(b.at);
      // A igual hora, el inicio de ronda va primero.
      if (d !== 0) return d;
      return a.tipo === "evento" ? -1 : 1;
    });
    const nMensajes = items.filter((it) => it.tipo === "mensaje").length;
    return { n, items, nMensajes };
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
        <MessageSquare className="w-4 h-4 text-[#CC5200]" />
        <span className="font-semibold text-slate-700 text-sm">
          {role === "investigador" ? "Mensajes con revisores" : "Mensajes con investigador/a"}
        </span>
        {messages.length > 0 && (
          <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full ml-1">
            {messages.length}
          </span>
        )}
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
          </div>
        ) : (
          <div className="space-y-3 mb-5">
            {rondas.map(({ n, items, nMensajes }) => {
              const abierta = abiertasEfectivas.has(n);
              const actual = n === currentRound;
              return (
                <div key={n} className={`rounded-xl border ${actual ? "border-violet-200" : "border-slate-100"}`}>
                  <button
                    onClick={() => toggle(n)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-left transition-colors ${
                      actual ? "bg-violet-50/60 hover:bg-violet-50" : "bg-slate-50/60 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`text-xs font-bold uppercase tracking-wide ${actual ? "text-violet-700" : "text-slate-500"}`}>
                        {tituloRonda(n)}
                      </span>
                      {actual && (
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-violet-500 text-white px-2 py-0.5 rounded-full">
                          Actual
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-slate-400">
                      {nMensajes === 0 ? "Sin mensajes" : `${nMensajes} mensaje${nMensajes !== 1 ? "s" : ""}`}
                      {abierta ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  {abierta && (
                    <div
                      ref={actual ? listaActualRef : undefined}
                      className="space-y-3 px-4 py-4 max-h-96 overflow-y-auto"
                    >
                      {items.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-2">Sin mensajes en esta ronda.</p>
                      ) : (
                        items.map((it) =>
                          it.tipo === "mensaje"
                            ? <MensajeBurbuja key={it.m.id} m={it.m} role={role} />
                            : <EventoFila key={`${it.e.kind}-${it.e.round}-${it.at}`} e={it.e} role={role} />,
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Send form */}
        {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
          {role === "investigador" ? "Tu respuesta" : "Tu revisión"} · {tituloRonda(currentRound)}
        </p>
        <div className="flex gap-2 items-end">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={
              role === "investigador"
                ? "Escribe tu respuesta a los revisores..."
                : "Escribe tus observaciones para el investigador/a..."
            }
            rows={2}
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#CC5200] resize-none"
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className="flex items-center gap-1.5 text-sm font-semibold text-white bg-[#CC5200] hover:bg-[#B34700] disabled:opacity-40 px-4 py-2.5 rounded-xl transition-colors shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        {role === "investigador" && (
          <p className="text-[11px] text-slate-400 mt-2">
            Los revisores aparecen como <strong>Revisor 1</strong> y <strong>Revisor 2</strong>. Sus identidades no son reveladas.
          </p>
        )}
      </div>
    </div>
  );
}
