"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MessageSquare, Send, Loader2 } from "lucide-react";

interface Message {
  id: string;
  sender_type: "investigador" | "revisor1" | "revisor2";
  body: string;
  created_at: string;
}

interface Props {
  projectId: string;
  role: "investigador" | "reviewer";
}

function senderLabel(type: string, role: "investigador" | "reviewer") {
  if (role === "investigador") {
    if (type === "investigador") return "Tú";
    return type === "revisor1" ? "Revisor 1" : "Revisor 2";
  }
  if (type === "investigador") return "Investigador/a";
  return type === "revisor1" ? "Revisor 1" : "Revisor 2";
}

function isOwnMessage(type: string, role: "investigador" | "reviewer") {
  if (role === "investigador") return type === "investigador";
  return type === "revisor1" || type === "revisor2";
}

export default function ProjectMessages({ projectId, role }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState("");
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState("");
  const bottomRef               = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/messages`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? []);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        {/* Message thread */}
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Sin mensajes aún.</p>
        ) : (
          <div className="space-y-3 mb-5 max-h-72 overflow-y-auto pr-1">
            {messages.map((m) => {
              const own   = isOwnMessage(m.sender_type, role);
              const label = senderLabel(m.sender_type, role);
              return (
                <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                    own ? "bg-[#1A1A1A] text-white" : "bg-slate-100 text-slate-700"
                  }`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wide mb-1.5 ${
                      own ? "text-[#CC5200]" : "text-slate-400"
                    }`}>
                      {label}
                    </p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
                    <p className={`text-[10px] mt-2 ${own ? "text-slate-500" : "text-slate-400"}`}>
                      {new Date(m.created_at).toLocaleDateString("es-CL", {
                        day: "numeric", month: "short",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Send form */}
        {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
        <div className="flex gap-2 items-end">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={
              role === "investigador"
                ? "Escribe un mensaje para los revisores..."
                : "Escribe tu respuesta al investigador/a..."
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
