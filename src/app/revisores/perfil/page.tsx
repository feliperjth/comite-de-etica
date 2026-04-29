"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { themes } from "@/lib/themes";
import { CheckCircle, BookOpen } from "lucide-react";

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  return document.cookie.split("; ").find((r) => r.startsWith(name + "="))?.split("=")[1] ?? "";
}

export default function PerfilRevisor() {
  const router = useRouter();
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [expertise, setExpertise] = useState<string[]>([]);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  useEffect(() => {
    const n = decodeURIComponent(getCookie("reviewer_name"));
    const e = decodeURIComponent(getCookie("reviewer_email"));
    if (!n || !e) { router.push("/revisores"); return; }
    setName(n);
    setEmail(e);

    // Load existing expertise
    fetch("/api/reviewers")
      .then((r) => r.json())
      .then((reviewers: { email: string; expertise: string[] }[]) => {
        const mine = reviewers.find((r) => r.email === e);
        if (mine?.expertise?.length) setExpertise(mine.expertise);
      });
  }, [router]);

  function toggle(id: string) {
    setExpertise((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  }

  async function handleSave() {
    if (expertise.length !== 3) { setError("Debes seleccionar exactamente 3 áreas."); return; }
    setSaving(true);
    setError("");
    const res = await fetch("/api/reviewers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, expertise }),
    });
    if (res.ok) {
      router.push("/revisores/dashboard");
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al guardar");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-10">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-[#CC5200] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">Áreas de experticia</h1>
            <p className="text-slate-400 text-sm">Selecciona exactamente <strong>3 temáticas</strong> que representan tu expertise como revisor/a</p>
          </div>

          {name && (
            <div className="bg-slate-50 rounded-xl px-4 py-3 mb-6 text-sm text-slate-600">
              <strong>{name}</strong> · {email}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 mb-6">
            {themes.map((t) => {
              const selected = expertise.includes(t.id);
              const disabled = !selected && expertise.length >= 3;
              return (
                <button
                  key={t.id}
                  onClick={() => toggle(t.id)}
                  disabled={disabled}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                    selected
                      ? "border-[#CC5200] bg-orange-50"
                      : disabled
                      ? "border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-2xl shrink-0">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 text-sm">{t.label}</div>
                    <div className="text-xs text-slate-400 truncate">{t.desc}</div>
                  </div>
                  {selected && <CheckCircle className="w-5 h-5 text-[#CC5200] shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-slate-400">
              {expertise.length}/3 seleccionadas
            </span>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`w-6 h-1.5 rounded-full ${i < expertise.length ? "bg-[#CC5200]" : "bg-slate-200"}`} />
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 mb-4 text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={expertise.length !== 3 || saving}
            className="w-full bg-[#1A1A1A] hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
          >
            {saving ? "Guardando..." : "Guardar y entrar al panel"}
          </button>
        </div>
      </div>
    </div>
  );
}
