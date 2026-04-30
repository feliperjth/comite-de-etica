"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Plus, ChevronDown, LogOut, FolderOpen, LayoutDashboard, User, Shield, BarChart2, ClipboardList } from "lucide-react";
import LogoImage from "./LogoImage";

type SessionUser = {
  type: "investigador" | "comite" | "none";
  name?: string;
  email?: string;
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const links = [
  { href: "/",           label: "Inicio" },
  { href: "/projects",   label: "Proyectos" },
  { href: "/track",      label: "Seguimiento" },
  { href: "/documentos", label: "Documentos" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [user, setUser]       = useState<SessionUser>({ type: "none" });
  const [open, setOpen]       = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then(setUser);
  }, [pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    setOpen(false);
    if (user.type === "investigador") {
      await fetch("/api/investigador/auth", { method: "DELETE" });
      router.push("/investigador");
    } else if (user.type === "comite") {
      await fetch("/api/comite/auth", { method: "DELETE" });
      router.push("/comite");
    }
    setUser({ type: "none" });
  }

  return (
    <nav className="bg-uai-navy text-white shadow-lg sticky top-0 z-50 border-b border-white/10">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-4 group shrink-0">
          <LogoImage
            src="/logo-uai.png"
            alt="Universidad Adolfo Ibáñez"
            width={80}
            height={40}
            fallback="UAI"
            className="h-10 w-auto object-contain brightness-0 invert"
          />
          <div className="h-8 w-px bg-white/20" />
          <div>
            <div className="font-bold text-white text-sm leading-tight">Comité de Ética</div>
            <div className="text-xs text-white/60 leading-tight">Escuela de Psicología</div>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <LogoImage
            src="/logo-psicologia.png"
            alt="Escuela de Psicología UAI"
            width={40}
            height={40}
            fallback="Psic."
            className="h-10 w-auto object-contain brightness-0 invert"
          />
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-6">
          {/* Nav links */}
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium transition-colors relative ${
                pathname === href ? "text-uai-gold" : "text-white/70 hover:text-white"
              }`}
            >
              {label}
              {pathname === href && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-uai-gold rounded-full" />
              )}
            </Link>
          ))}

          {/* Nuevo proyecto button — hide when logged in as comité */}
          {user.type !== "comite" && (
            <Link
              href="/submit"
              className="flex items-center gap-1.5 bg-uai-gold hover:bg-uai-gold-hover text-uai-navy font-bold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo proyecto
            </Link>
          )}

          {/* User avatar + dropdown */}
          {user.type !== "none" && user.name ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2.5 bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-xl transition-colors"
              >
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                  user.type === "comite" ? "bg-uai-gold text-uai-navy" : "bg-blue-400 text-white"
                }`}>
                  {getInitials(user.name)}
                </div>
                <span className="text-sm font-semibold text-white max-w-[120px] truncate">
                  {user.name.split(" ")[0]}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-white/60 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown */}
              {open && (
                <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 mb-0.5">
                      {user.type === "comite"
                        ? <Shield className="w-3.5 h-3.5 text-[#CC5200]" />
                        : <User className="w-3.5 h-3.5 text-blue-500" />
                      }
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                        {user.type === "comite" ? "Miembro del Comité" : "Investigador"}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-800 text-sm truncate">{user.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>

                  {/* Menu items */}
                  <div className="py-1.5">
                    {user.type === "investigador" && (
                      <Link
                        href="/investigador/perfil"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <FolderOpen className="w-4 h-4 text-slate-400" />
                        Mis proyectos
                      </Link>
                    )}

                    {user.type === "comite" && (
                      <>
                        <Link
                          href="/comite/perfil"
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <FolderOpen className="w-4 h-4 text-slate-400" />
                          Mi perfil
                        </Link>
                        <Link
                          href="/revisores/dashboard"
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4 text-slate-400" />
                          Panel completo
                        </Link>
                        <Link
                          href="/investigador/perfil"
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <ClipboardList className="w-4 h-4 text-slate-400" />
                          Ver investigadores
                        </Link>
                        {user.email === "felipe.rojast@uai.cl" && (
                          <Link
                            href="/coordinador"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-violet-700 hover:bg-violet-50 transition-colors font-semibold"
                          >
                            <BarChart2 className="w-4 h-4 text-violet-500" />
                            Estadísticas
                          </Link>
                        )}
                      </>
                    )}
                  </div>

                  <div className="border-t border-slate-100 py-1.5">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Not logged in — show Revisores link */
            <Link
              href="/revisores"
              className="text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              Revisores
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
