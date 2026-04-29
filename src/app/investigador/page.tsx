"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, ArrowRight, Eye, EyeOff } from "lucide-react";

type Tab = "login" | "register";

const inputClass =
  "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";

export default function InvestigadorLogin() {
  const [tab, setTab]               = useState<Tab>("login");
  const [name, setName]             = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const router = useRouter();

  function switchTab(t: Tab) {
    setTab(t);
    setError("");
    setPassword("");
    setConfirm("");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/investigador/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }
    router.push("/investigador/perfil");
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Las claves no coinciden.");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/investigador/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), name: name.trim(), password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }
    router.push("/investigador/perfil");
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-10">
          {/* Icon + title */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-uai-navy mb-1">Perfil Investigador</h1>
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
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Correo institucional
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@uai.cl"
                  autoFocus
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Clave
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tu clave personal"
                    className={`${inputClass} pr-11`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full bg-uai-navy hover:bg-uai-navy-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {loading ? "Verificando..." : <>Acceder <ArrowRight className="w-4 h-4" /></>}
              </button>

              <p className="text-center text-xs text-slate-400">
                ¿Primera vez?{" "}
                <button
                  type="button"
                  onClick={() => switchTab("register")}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Crea tu perfil aquí
                </button>
              </p>
            </form>
          )}

          {/* REGISTER */}
          {tab === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nombre completo
                </label>
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
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Correo institucional
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@uai.cl"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Clave <span className="text-slate-400 font-normal">(mín. 6 caracteres)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Elige una clave segura"
                    className={`${inputClass} pr-11`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Confirmar clave
                </label>
                <input
                  type={showPass ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repite tu clave"
                  className={inputClass}
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email || !name || !password || !confirm}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {loading ? "Creando perfil..." : <>Crear perfil <ArrowRight className="w-4 h-4" /></>}
              </button>

              <p className="text-center text-xs text-slate-400">
                ¿Ya tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={() => switchTab("login")}
                  className="text-blue-600 hover:underline font-medium"
                >
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
