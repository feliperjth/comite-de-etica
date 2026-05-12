"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import Link from "next/link";

type Tab = "login" | "register";

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  return document.cookie.split("; ").find((r) => r.startsWith(name + "="))?.split("=")[1] ?? "";
}

const inputClass =
  "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all";

export default function RevisoresLogin() {
  const [tab, setTab]               = useState<Tab>("login");
  const [name, setName]             = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [checking, setChecking]     = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedEmail = decodeURIComponent(getCookie("reviewer_email"));
    if (savedEmail) {
      router.replace("/revisores/dashboard");
    } else {
      setChecking(false);
    }
  }, [router]);

  if (checking) return null;

  function switchTab(t: Tab) {
    setTab(t);
    setError("");
    setPassword("");
    setName("");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, email: email.trim() }),
    });

    if (res.ok) {
      const reviewersRes = await fetch("/api/reviewers");
      const reviewers = await reviewersRes.json();
      const myProfile = reviewers.find((r: { email: string }) => r.email === email.trim());
      if (!myProfile || !myProfile.expertise?.length) {
        router.push("/revisores/perfil");
      } else {
        router.push("/revisores/dashboard");
      }
    } else {
      const data = await res.json();
      setError(data.error ?? "Error al verificar la clave");
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("El nombre es obligatorio."); return; }
    setLoading(true);
    setError("");

    // Verify committee password and set cookies
    const authRes = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, email: email.trim() }),
    });

    if (!authRes.ok) {
      const data = await authRes.json();
      setError(data.error ?? "Clave del comité incorrecta");
      setLoading(false);
      return;
    }

    // Pre-create reviewer record with name (expertise set later in /perfil)
    await fetch("/api/reviewers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), expertise: [] }),
    });

    // Reload to pick up the updated name cookie (auth sets it from DB lookup)
    // Re-auth so cookie has the name
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, email: email.trim() }),
    });

    router.push("/revisores/perfil");
  }

  const canLoginSubmit   = password && email.trim();
  const canRegisterSubmit = password && email.trim() && name.trim();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-10">

          {/* Icon + title */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <ClipboardList className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-uai-navy mb-1">Panel de Revisores</h1>
            <p className="text-slate-400 text-sm">Comité de Ética · Escuela de Psicología UAI</p>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-7">
            <button
              onClick={() => switchTab("login")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                tab === "login"
                  ? "bg-white text-uai-navy shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => switchTab("register")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                tab === "register"
                  ? "bg-white text-uai-navy shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Crear perfil
            </button>
          </div>

          {/* LOGIN */}
          {tab === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Correo institucional</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="revisora@uai.cl"
                  autoFocus
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Clave del comité</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Clave de acceso"
                    className={`${inputClass} pr-11`}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 text-center">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading || !canLoginSubmit}
                className="w-full bg-uai-navy hover:bg-uai-navy-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2">
                {loading ? "Verificando..." : <>Ingresar al panel <ArrowRight className="w-4 h-4" /></>}
              </button>

              <p className="text-center text-xs text-slate-400">
                ¿Primera vez?{" "}
                <button type="button" onClick={() => switchTab("register")}
                  className="text-emerald-600 hover:underline font-medium">
                  Crea tu perfil aquí
                </button>
              </p>
            </form>
          )}

          {/* REGISTER */}
          {tab === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="María González Pérez"
                  autoFocus
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Correo institucional</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="revisora@uai.cl"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Clave del comité
                  <span className="text-slate-400 font-normal ml-1">(proporcionada por coordinación)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Clave compartida del comité"
                    className={`${inputClass} pr-11`}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 text-center">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading || !canRegisterSubmit}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2">
                {loading ? "Creando perfil..." : <>Crear perfil <ArrowRight className="w-4 h-4" /></>}
              </button>

              <p className="text-center text-xs text-slate-400">
                ¿Ya tienes cuenta?{" "}
                <button type="button" onClick={() => switchTab("login")}
                  className="text-emerald-600 hover:underline font-medium">
                  Inicia sesión
                </button>
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          <Link href="/" className="hover:text-slate-600 transition-colors">
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
