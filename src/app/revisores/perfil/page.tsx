"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { themes } from "@/lib/themes";
import { CheckCircle, User, ArrowLeft, Save, RefreshCw, LogOut, ClipboardList, Clock } from "lucide-react";

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
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState("");
  const [ready, setReady]         = useState(false);
  const [editing, setEditing]     = useState(false);
  const [reviewsDone, setReviewsDone]       = useState(0);
  const [projectsAssigned, setProjectsAssigned] = useState(0);

  useEffect(() => {
    const cookieEmail = decodeURIComponent(getCookie("reviewer_email"));
    const cookieName  = decodeURIComponent(getCookie("reviewer_name"));
    if (!cookieEmail) { router.push("/revisores"); return; }

    fetch("/api/me").then(r => r.json()).then(me => {
      // Only redirect coordinators (have comite_email cookie) or admin
      const hasComiteEmail = !!getCookie("comite_email");
      if (me.type === "admin" || hasComiteEmail) {
        router.replace("/comite/perfil");
      }
    });

    setEmail(cookieEmail);

    fetch("/api/reviewers")
      .then((r) => r.json())
      .then((reviewers: { email: string; name: string; expertise: string[] }[]) => {
        const mine = reviewers.find((r) => r.email === cookieEmail);
        setName(mine?.name ?? cookieName ?? "");
        const areas = mine?.expertise ?? [];
        setExpertise(areas);
        if (areas.length === 0) setEditing(true);
        setReady(true);
      });

    // Stats: reviews done + assigned projects
    fetch("/api/comite/reviews")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setReviewsDone((data.reviews ?? []).length);
        setProjectsAssigned((data.assignedProjects ?? []).length);
      });
  }, [router]);

  function toggle(id: string) {
    setSaved(false);
    setExpertise((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  }

  async function handleSave() {
    if (!name.trim()) { setError("El nombre es obligatorio."); return; }
    if (expertise.length !== 3) { setError("Debes seleccionar exactamente 3 áreas."); return; }
    setSaving(true);
    setError("");
    const res = await fetch("/api/reviewers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, expertise }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setEditing(false);
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al guardar");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/revisores");
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-300" />
      </div>
    );
  }

  const selectedThemes = themes.filter((t) => expertise.includes(t.id));

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/revisores/dashboard"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver al panel
        </Link>
        <button onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-600 transition-colors">
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Profile header */}
        <div className="bg-gradient-to-r from-[#CC5200]/10 to-orange-50 px-8 py-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#CC5200] rounded-2xl flex items-center justify-center shadow-sm shrink-0">
              <span className="text-white font-bold text-xl">
                {name ? name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase() : "?"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setSaved(false); }}
                    className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                  />
                </div>
              ) : (
                <h1 className="text-xl font-bold text-slate-800">{name || "Sin nombre"}</h1>
              )}
              <p className="text-sm text-slate-500 mt-0.5">{email}</p>
              <span className="inline-block mt-1 text-[10px] font-bold bg-[#CC5200]/10 text-[#CC5200] px-2 py-0.5 rounded-full uppercase tracking-wide">
                Miembro del Comité
              </span>
            </div>
          </div>
        </div>

        <div className="px-8 py-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center mb-2 shadow-sm border border-slate-100">
                <ClipboardList className="w-4 h-4 text-slate-600" />
              </div>
              <div className="text-2xl font-bold text-slate-800">{reviewsDone}</div>
              <div className="text-xs text-slate-400 mt-0.5">Proyectos revisados</div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center mb-2 shadow-sm border border-amber-100">
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-amber-600">{projectsAssigned}</div>
              <div className="text-xs text-slate-400 mt-0.5">Proyectos asignados</div>
            </div>
          </div>

          {/* Section title */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-slate-800">Áreas de experticia</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {editing ? "Selecciona exactamente 3 áreas" : "Las 3 temáticas que representan tu expertise como revisor/a"}
              </p>
            </div>
            {!editing && (
              <button
                onClick={() => { setEditing(true); setSaved(false); }}
                className="text-xs font-semibold text-[#CC5200] hover:text-[#a84200] border border-[#CC5200]/30 hover:border-[#CC5200] px-3 py-1.5 rounded-lg transition-colors"
              >
                Cambiar áreas
              </button>
            )}
          </div>

          {/* View mode: show selected areas as cards */}
          {!editing && (
            <div className="space-y-2 mb-2">
              {selectedThemes.length > 0 ? selectedThemes.map((t) => (
                <div key={t.id} className="flex items-center gap-3 bg-orange-50 border border-[#CC5200]/20 rounded-xl px-4 py-3">
                  <span className="text-xl shrink-0">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 text-sm">{t.label}</div>
                    <div className="text-xs text-slate-400">{t.desc}</div>
                  </div>
                  <CheckCircle className="w-4 h-4 text-[#CC5200] shrink-0" />
                </div>
              )) : (
                <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                  No has seleccionado áreas aún.{" "}
                  <button onClick={() => setEditing(true)} className="text-[#CC5200] font-semibold">
                    Seleccionar ahora
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Edit mode: full grid */}
          {editing && (
            <div className="grid grid-cols-1 gap-2 mb-4">
              {themes.map((t) => {
                const selected = expertise.includes(t.id);
                const disabled = !selected && expertise.length >= 3;
                return (
                  <button
                    key={t.id}
                    onClick={() => toggle(t.id)}
                    disabled={disabled}
                    className={`flex items-center gap-4 p-3.5 rounded-2xl border-2 text-left transition-all ${
                      selected
                        ? "border-[#CC5200] bg-orange-50"
                        : disabled
                        ? "border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-xl shrink-0">{t.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 text-sm">{t.label}</div>
                      <div className="text-xs text-slate-400 truncate">{t.desc}</div>
                    </div>
                    {selected && <CheckCircle className="w-5 h-5 text-[#CC5200] shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {editing && (
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-slate-400">{expertise.length}/3 seleccionadas</span>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`w-6 h-1.5 rounded-full ${i < expertise.length ? "bg-[#CC5200]" : "bg-slate-200"}`} />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">
              {error}
            </div>
          )}

          {saved && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" /> Cambios guardados correctamente.
            </div>
          )}

          {editing && (
            <div className="flex gap-3">
              <button
                onClick={() => { setEditing(false); setError(""); }}
                className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={expertise.length !== 3 || saving}
                className="flex-1 flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
              >
                <Save className="w-4 h-4" />
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
