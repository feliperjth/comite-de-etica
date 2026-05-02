"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, CheckCircle2, Clock, Users } from "lucide-react";

// ─── Hooks ─────────────────────────────────────────────────────────────────

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useCountUp(target: number, duration: number, active: boolean, delay: number) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - t0) / duration, 1);
        setVal(Math.round((1 - (1 - p) ** 3) * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(id);
  }, [active, target, duration, delay]);
  return val;
}

// ─── Ring gauge (SVG arc) ──────────────────────────────────────────────────

function RingGauge({ pct, color, size = 64, sw = 5, delay = 0, active }: {
  pct: number; color: string; size?: number; sw?: number; delay?: number; active: boolean;
}) {
  const r = (size - sw) / 2;
  const C = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={`${active ? (pct / 100) * C : 0} ${C}`}
        style={{ transition: active ? `stroke-dasharray 2s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms` : "none" }}
      />
    </svg>
  );
}

// ─── KPI cards ─────────────────────────────────────────────────────────────

const KPIS = [
  { num: 120, suffix: "+",      label: "Proyectos evaluados",      sub: "Desde enero 2023",             color: "#f59e0b", ring: 82,  Icon: Activity },
  { num: 94,  suffix: "%",      label: "Tasa de aprobación",        sub: "Promedio histórico",           color: "#10b981", ring: 94,  Icon: CheckCircle2 },
  { num: 12,  suffix: " días",  label: "Tiempo de respuesta",       sub: "Promedio por ronda de revisión", color: "#60a5fa", ring: 60, Icon: Clock },
  { num: 8,   suffix: "",       label: "Revisores especializados",  sub: "Equipo activo del comité",     color: "#c084fc", ring: 80,  Icon: Users },
] as const;

function KPICard({ kpi, active, index }: { kpi: typeof KPIS[number]; active: boolean; index: number }) {
  const val = useCountUp(kpi.num, 1800, active, index * 130);
  return (
    <div className="relative rounded-2xl border border-white/[0.07] bg-white/[0.04] p-5 overflow-hidden group hover:bg-white/[0.07] hover:border-white/[0.13] transition-all duration-300">
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-35 transition-opacity pointer-events-none"
        style={{ backgroundColor: kpi.color }}
      />
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${kpi.color}1a`, color: kpi.color }}
        >
          <kpi.Icon className="w-4 h-4" />
        </div>
        <RingGauge pct={kpi.ring} color={kpi.color} active={active} delay={index * 130} />
      </div>
      <div className="text-3xl font-bold text-white tracking-tight leading-none mb-1.5 tabular-nums">
        {val}{kpi.suffix}
      </div>
      <div className="text-xs font-semibold text-white/55 mb-0.5">{kpi.label}</div>
      <div className="text-[11px] text-white/25">{kpi.sub}</div>
    </div>
  );
}

// ─── Donut chart ───────────────────────────────────────────────────────────

const DONUT = [
  { label: "Aprobados",    pct: 65, color: "#10b981" },
  { label: "En revisión",  pct: 20, color: "#60a5fa" },
  { label: "Correcciones", pct: 10, color: "#f59e0b" },
  { label: "Pendientes",   pct:  5, color: "#475569" },
] as const;

function DonutChart({ active }: { active: boolean }) {
  const cx = 90, cy = 90, r = 68, sw = 17;
  const C = 2 * Math.PI * r;
  let cum = 0;

  return (
    <div className="flex items-center gap-7 flex-wrap justify-center sm:justify-start">
      <div className="relative shrink-0">
        <svg width={180} height={180} viewBox="0 0 180 180">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw} />
          {DONUT.map((seg, i) => {
            const len = active ? (seg.pct / 100) * C : 0;
            const offset = -(cum / 100) * C;
            cum += seg.pct;
            return (
              <circle
                key={seg.label}
                cx={cx} cy={cy} r={r}
                fill="none" stroke={seg.color} strokeWidth={sw} strokeLinecap="butt"
                strokeDasharray={`${len} ${C}`}
                strokeDashoffset={offset}
                style={{
                  transition: active ? `stroke-dasharray 1.5s ease-out ${i * 220 + 300}ms` : "none",
                  transform: "rotate(-90deg)",
                  transformOrigin: `${cx}px ${cy}px`,
                }}
              />
            );
          })}
          {/* donut hole */}
          <circle cx={cx} cy={cy} r={r - sw / 2 - 0.5} fill="#040E1C" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-white leading-none">120+</span>
          <span className="text-[10px] text-white/35 tracking-widest font-semibold mt-0.5">TOTAL</span>
        </div>
      </div>

      <div className="flex-1 min-w-[130px] space-y-3">
        {DONUT.map((seg, i) => (
          <div key={seg.label}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="text-xs text-white/55 font-medium">{seg.label}</span>
              </div>
              <span className="text-xs font-bold tabular-nums" style={{ color: seg.color }}>{seg.pct}%</span>
            </div>
            <div className="h-1 rounded-full bg-white/[0.07] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: active ? `${(seg.pct / 65) * 100}%` : "0%",
                  backgroundColor: seg.color,
                  transition: active ? `width 1.2s ease-out ${i * 150 + 600}ms` : "none",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pillar progress bars ──────────────────────────────────────────────────

const PILLARS = [
  { label: "Autonomía",     sub: "Consentimiento, voluntariedad, confidencialidad", pct: 92, color: "#60a5fa" },
  { label: "Beneficencia",  sub: "Beneficios maximizados, riesgos minimizados",     pct: 87, color: "#f59e0b" },
  { label: "Justicia",      sub: "Selección equitativa, acceso a beneficios",       pct: 95, color: "#10b981" },
] as const;

function PillarBars({ active }: { active: boolean }) {
  return (
    <div className="space-y-6">
      {PILLARS.map((p, i) => (
        <div key={p.label}>
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-sm font-bold text-white/70">{p.label}</p>
              <p className="text-[11px] text-white/30 mt-0.5">{p.sub}</p>
            </div>
            <span className="text-2xl font-bold tabular-nums" style={{ color: p.color }}>
              {active ? `${p.pct}%` : "0%"}
            </span>
          </div>
          <div className="relative h-3 rounded-full bg-white/[0.07] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: active ? `${p.pct}%` : "0%",
                background: `linear-gradient(90deg, ${p.color}80, ${p.color})`,
                boxShadow: `0 0 14px ${p.color}55`,
                transition: active
                  ? `width 1.8s cubic-bezier(0.34,1.56,0.64,1) ${i * 220 + 200}ms`
                  : "none",
              }}
            />
          </div>
          {/* tick marks */}
          <div className="flex justify-between mt-1.5 px-0.5">
            {[0, 25, 50, 75, 100].map((t) => (
              <span key={t} className="text-[9px] text-white/20 tabular-nums">{t}%</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Floating particle dots (decorative) ──────────────────────────────────

function Particles() {
  const dots = [
    { x: "8%",  y: "18%", size: 2,   opacity: 0.3, dur: 3.2 },
    { x: "18%", y: "72%", size: 3,   opacity: 0.2, dur: 4.1 },
    { x: "82%", y: "15%", size: 2.5, opacity: 0.25, dur: 3.7 },
    { x: "91%", y: "65%", size: 2,   opacity: 0.2, dur: 4.8 },
    { x: "50%", y: "88%", size: 1.5, opacity: 0.15, dur: 3.5 },
    { x: "35%", y: "12%", size: 1.5, opacity: 0.2, dur: 5.0 },
    { x: "70%", y: "80%", size: 2,   opacity: 0.15, dur: 4.3 },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {dots.map((d, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-blue-400"
          style={{
            left: d.x, top: d.y,
            width: d.size, height: d.size,
            opacity: d.opacity,
            animation: `pulse ${d.dur}s ease-in-out infinite`,
            animationDelay: `${i * 0.5}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────

export default function AnimatedStats() {
  const { ref, inView } = useInView();

  return (
    <section className="relative bg-[#040E1C] py-20 px-4 overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-900/25 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-amber-900/20 rounded-full blur-3xl pointer-events-none translate-y-1/3" />
      <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-violet-950/30 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <Particles />

      <div ref={ref} className="relative max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 border border-white/[0.09] bg-white/[0.04] px-4 py-1.5 rounded-full mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold text-white/45 uppercase tracking-[0.15em]">
              Datos del comité · 2025
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
            Impacto en ética de la investigación
          </h2>
          <p className="text-white/40 text-sm max-w-lg mx-auto leading-relaxed">
            Métricas de la actividad del Comité de Ética de la Escuela de Psicología UAI
          </p>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {KPIS.map((kpi, i) => (
            <KPICard key={kpi.label} kpi={kpi} active={inView} index={i} />
          ))}
        </div>

        {/* Charts grid */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* Donut – project status */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] backdrop-blur-sm p-6">
            <div className="flex items-center gap-2.5 mb-6">
              <span className="w-1.5 h-5 rounded-full bg-amber-400" />
              <h3 className="text-[11px] font-bold text-white/45 uppercase tracking-[0.12em]">
                Distribución de proyectos
              </h3>
            </div>
            <DonutChart active={inView} />
          </div>

          {/* Pillar bars */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] backdrop-blur-sm p-6">
            <div className="flex items-center gap-2.5 mb-6">
              <span className="w-1.5 h-5 rounded-full bg-violet-400" />
              <h3 className="text-[11px] font-bold text-white/45 uppercase tracking-[0.12em]">
                Cumplimiento por pilar ético
              </h3>
            </div>
            <PillarBars active={inView} />
          </div>

        </div>

        <p className="text-center text-[11px] text-white/20 mt-6">
          * Estadísticas representativas · Comité de Ética · Escuela de Psicología · Universidad Adolfo Ibáñez
        </p>
      </div>
    </section>
  );
}
