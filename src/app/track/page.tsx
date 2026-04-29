"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export default function TrackSearchPage() {
  const [code, setCode] = useState("");
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean) router.push(`/track/${clean}`);
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#1A1A1A] rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Search className="w-8 h-8 text-[#CC5200]" />
            </div>
            <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">Seguimiento</h1>
            <p className="text-slate-400 text-sm">Ingresa tu código para ver el estado de tu proyecto</p>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Código de seguimiento</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CE-XXXXXX"
                autoFocus
                maxLength={9}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono font-bold text-center tracking-widest text-[#1A1A1A] placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#CC5200] focus:border-transparent transition-all uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={!code.trim()}
              className="w-full bg-[#1A1A1A] hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
            >
              Consultar estado
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          El código fue enviado al correo al momento de enviar tu proyecto.
        </p>
      </div>
    </div>
  );
}
