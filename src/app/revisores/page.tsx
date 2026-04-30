"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  return document.cookie.split("; ").find((r) => r.startsWith(name + "="))?.split("=")[1] ?? "";
}

export default function RevisoresLogin() {
  const [password, setPassword]     = useState("");
  const [name, setName]             = useState("");
  const [email, setEmail]           = useState("");
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking]     = useState(true);
  const router = useRouter();

  // If already logged in, skip login page
  useEffect(() => {
    const savedEmail = decodeURIComponent(getCookie("reviewer_email"));
    const savedName  = decodeURIComponent(getCookie("reviewer_name"));
    if (savedEmail && savedName) {
      router.replace("/revisores/dashboard");
    } else {
      setChecking(false);
    }
  }, [router]);

  if (checking) return null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, name: name.trim(), email: email.trim() }),
    });

    if (res.ok) {
      // Check if reviewer has expertise set
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

  const canSubmit = password && name.trim() && email.trim();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-uai-navy rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-950/20">
              <Lock className="w-8 h-8 text-uai-gold" />
            </div>
            <h1 className="text-2xl font-bold text-uai-navy mb-1">Acceso Revisores</h1>
            <p className="text-slate-400 text-sm">Comité de Ética · Escuela de Psicología UAI</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Tu nombre completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dra. Ana Ríos"
                autoFocus
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Tu correo institucional</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="revisora@uai.cl"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
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
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent pr-11 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
              disabled={loading || !canSubmit}
              className="w-full bg-uai-navy hover:bg-uai-navy-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors shadow-sm"
            >
              {loading ? "Verificando..." : "Ingresar al panel"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          ¿Eres investigador?{" "}
          <Link href="/" className="text-[#CC5200] hover:underline font-medium">
            Ir al portal principal
          </Link>
        </p>
      </div>
    </div>
  );
}
