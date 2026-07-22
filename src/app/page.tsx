import Link from "next/link";
import { getHomeStats } from "@/lib/stats";
import { FileText, Bot, BarChart3, Users, Heart, Shield, ArrowRight, CheckCircle, ExternalLink, BookOpen, FileSearch } from "lucide-react";

const features = [
  {
    icon: FileText,
    color: "bg-blue-50 text-blue-600",
    title: "Envío de Proyectos",
    description: "Sube todos los documentos requeridos de forma organizada: protocolo, consentimiento informado, instrumentos y más.",
  },
  {
    icon: Bot,
    color: "bg-violet-50 text-violet-600",
    title: "Pre-revisión con IA",
    description: "Antes de enviar, recibe retroalimentación gratuita basada en los tres pilares éticos de la investigación en psicología.",
  },
  {
    icon: BarChart3,
    color: "bg-amber-50 text-amber-600",
    title: "Seguimiento en Tiempo Real",
    description: "Monitorea el estado de tu proyecto: enviado, en revisión, con observaciones o aprobado.",
  },
];

const pillars = [
  {
    icon: Users,
    title: "Autonomía",
    subtitle: "Respeto por las personas",
    desc: "Consentimiento informado, confidencialidad, participación voluntaria y derecho a retiro.",
    gradient: "from-blue-600 to-blue-800",
    light: "bg-blue-50 border-blue-100",
  },
  {
    icon: Heart,
    title: "Beneficencia",
    subtitle: "No maleficencia",
    desc: "Maximizar el beneficio para los participantes y minimizar todo daño potencial.",
    gradient: "from-amber-500 to-orange-600",
    light: "bg-amber-50 border-amber-100",
  },
  {
    icon: Shield,
    title: "Justicia",
    subtitle: "Equidad e inclusión",
    desc: "Selección equitativa de participantes y distribución justa de cargas y beneficios.",
    gradient: "from-emerald-500 to-teal-600",
    light: "bg-emerald-50 border-emerald-100",
  },
];

const steps = [
  { num: "01", title: "Registra tu proyecto", desc: "Completa la información básica y selecciona la temática de tu investigación." },
  { num: "02", title: "Sube tus documentos", desc: "Adjunta el protocolo, consentimiento informado y demás documentos requeridos." },
  { num: "03", title: "Revisión IA previa", desc: "Identifica aspectos éticos a reforzar antes del envío formal, sin costo." },
  { num: "04", title: "Envío y seguimiento", desc: "Envía al comité y sigue el progreso de tu revisión en tiempo real." },
];


// Las cifras salen de la base en cada renderizado, con 5 minutos de caché:
// no necesitan ser al segundo, pero tampoco pueden congelarse en el build.
export const revalidate = 300;

/** Tailwind extrae las clases de forma estática, así que no valen plantillas. */
const COLUMNAS: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
};

export default async function Home() {
  const stats = await getHomeStats();

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-b from-uai-navy-dark via-uai-navy to-uai-navy-light text-white py-32 px-4 overflow-hidden">
        {/* Halo naranja: da calidez al negro y ancla la marca UAI. */}
        <div className="ce-halo absolute top-1/2 left-1/2 w-[680px] h-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(204,82,0,0.22)_0%,transparent_68%)] pointer-events-none" />

        {/* Red neuronal: nodos y sinapsis. Es la metáfora de la psicología que
            mejor envejece — mente como red de conexiones — y evita el tópico
            del diván o el cerebro ilustrado. Decorativa: oculta al lector de
            pantalla, que no gana nada describiéndola. */}
        <svg
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none opacity-70"
          viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice"
        >
          <g className="ce-deriva" stroke="rgba(204,82,0,0.28)" strokeWidth="1" fill="none">
            <path d="M120 180 L310 120 L470 230 L300 330 Z" />
            <path d="M470 230 L690 160 L860 260" />
            <path d="M300 330 L520 420 L760 380 L860 260" />
            <path d="M860 260 L1050 190 L1120 340" />
            <path d="M520 420 L640 540" />
            <path d="M310 120 L690 160" />
          </g>

          {/* Sinapsis: pulsos que recorren algunas conexiones. */}
          <g stroke="#CC5200" strokeWidth="2" fill="none" strokeLinecap="round">
            <path className="ce-sinapsis" d="M120 180 L310 120 L470 230" style={{ animationDelay: "0s" }} />
            <path className="ce-sinapsis" d="M300 330 L520 420 L760 380" style={{ animationDelay: "2.4s" }} />
            <path className="ce-sinapsis" d="M860 260 L1050 190 L1120 340" style={{ animationDelay: "4.1s" }} />
          </g>

          <g className="ce-deriva" fill="#CC5200">
            {[[120,180],[310,120],[470,230],[300,330],[690,160],[860,260],[520,420],[760,380],[1050,190],[1120,340],[640,540]].map(([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" opacity="0.75" />
            ))}
          </g>
        </svg>

        {/* Ψ de fondo: el símbolo de la psicología, apenas insinuado. */}
        <span
          aria-hidden="true"
          className="absolute right-[6%] top-1/2 -translate-y-1/2 text-[22rem] leading-none font-serif text-white/[0.035] select-none pointer-events-none hidden lg:block"
        >
          Ψ
        </span>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="ce-entrada inline-flex items-center gap-2 bg-white/[0.07] backdrop-blur-sm border border-white/10 text-uai-gold text-xs font-semibold uppercase tracking-[0.2em] px-4 py-2 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-uai-gold rounded-full animate-pulse" />
            Escuela de Psicología · Universidad Adolfo Ibáñez
          </div>

          <h1
            className="ce-entrada text-5xl md:text-7xl font-bold leading-[1.05] mb-6 tracking-tight"
            style={{ animationDelay: "0.1s" }}
          >
            Comité de Ética
            <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-uai-gold via-orange-400 to-uai-gold">
              Investigación en Psicología
            </span>
          </h1>

          <p
            className="ce-entrada text-slate-300 text-lg md:text-xl max-w-xl mx-auto mb-12 leading-relaxed"
            style={{ animationDelay: "0.2s" }}
          >
            Cuidar a quienes participan en la investigación es parte de investigar bien.
          </p>

          {/* Solo dos caminos: enviar y hacer seguimiento. El acceso de
              revisores y comité vive en la barra superior. */}
          <div className="ce-entrada flex gap-4 justify-center flex-wrap" style={{ animationDelay: "0.3s" }}>
            <Link
              href="/submit"
              className="group flex items-center gap-2 bg-uai-gold hover:bg-uai-gold-hover text-white font-bold px-9 py-4 rounded-xl transition-all shadow-lg shadow-[#CC5200]/25 hover:shadow-[#CC5200]/40 hover:-translate-y-0.5"
            >
              Enviar mi proyecto
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/track"
              className="group flex items-center gap-2 bg-white/[0.07] hover:bg-white/[0.14] text-white font-semibold px-9 py-4 rounded-xl transition-all border border-white/15 hover:border-white/30 hover:-translate-y-0.5"
            >
              <FileSearch className="w-4 h-4 text-uai-gold" />
              Seguir mi proyecto
            </Link>
          </div>
        </div>
      </section>

      {/* Stats — cifras reales de la base; la sección desaparece si no hay */}
      {stats.length > 0 && (
        <section className="bg-white border-b border-slate-100">
          <div className={`max-w-5xl mx-auto px-4 py-10 grid grid-cols-2 ${COLUMNAS[stats.length] ?? "md:grid-cols-4"} gap-8`}>
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold text-uai-navy">{s.value}</div>
                <div className="text-slate-400 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* INDH + Tres pilares */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-bold text-amber-600 uppercase tracking-widest mb-3">Marco ético de referencia</p>
            <h2 className="text-3xl font-bold text-uai-navy">Tres pilares fundamentales de la ética en investigación</h2>
            <p className="text-slate-500 mt-3 max-w-2xl mx-auto text-sm leading-relaxed">
              Basados en el Informe Belmont (1979), publicado por el Office for Human Research Protections
              del Departamento de Salud de EE.UU. y adoptados como estándar internacional en investigación con seres humanos.
            </p>
          </div>

          {/* Banner OHRP */}
          <a
            href="https://www.hhs.gov/ohrp/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col sm:flex-row items-start sm:items-center gap-5 bg-gradient-to-r from-uai-navy-dark to-uai-navy text-white rounded-2xl p-7 mb-10 hover:from-uai-navy hover:to-uai-navy-light transition-all shadow-lg shadow-blue-950/20"
          >
            <div className="w-14 h-14 bg-uai-gold rounded-2xl flex items-center justify-center shrink-0 shadow-md">
              <BookOpen className="w-7 h-7 text-uai-navy" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Referencia oficial</span>
              </div>
              <h3 className="font-bold text-lg leading-tight mb-1">
                Office for Human Research Protections (OHRP)
              </h3>
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-wide mb-2">
                U.S. Department of Health &amp; Human Services
              </p>
              <p className="text-blue-300 text-sm leading-relaxed">
                Organismo federal de EE.UU. que establece y vela por los estándares éticos en la investigación
                con seres humanos. Fuente del Informe Belmont y los tres principios que guían la ética en investigación a nivel mundial.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shrink-0 group-hover:border-white/30">
              Ver sitio OHRP
              <ExternalLink className="w-4 h-4" />
            </div>
          </a>

          {/* Tres pilares */}
          <div className="grid md:grid-cols-3 gap-6">
            {pillars.map((p) => (
              <div key={p.title} className={`${p.light} border rounded-2xl p-7 group hover:shadow-lg transition-all hover:-translate-y-1`}>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.gradient} flex items-center justify-center mb-5 shadow-sm`}>
                  <p.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-uai-navy text-lg mb-0.5">{p.title}</h3>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{p.subtitle}</p>
                <p className="text-slate-600 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Principios basados en el{" "}
            <a
              href="https://www.hhs.gov/ohrp/regulations-and-policy/belmont-report/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline inline-flex items-center gap-1"
            >
              Informe Belmont (1979) <ExternalLink className="w-3 h-3" />
            </a>
            {" "}· Aplicados al contexto de la investigación en psicología
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-bold text-amber-600 uppercase tracking-widest mb-3">Funcionalidades</p>
            <h2 className="text-3xl font-bold text-uai-navy">Todo lo que necesitas en un solo lugar</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-7 hover:shadow-lg transition-all hover:-translate-y-1 group">
                <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center mb-5`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-uai-navy text-lg mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-bold text-amber-600 uppercase tracking-widest mb-3">Proceso</p>
            <h2 className="text-3xl font-bold text-uai-navy">¿Cómo funciona?</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {steps.map((step) => (
              <div key={step.num} className="flex gap-5 group">
                <div className="w-12 h-12 rounded-xl bg-uai-navy text-uai-gold font-bold text-sm flex items-center justify-center shrink-0">
                  {step.num}
                </div>
                <div className="pt-1">
                  <h3 className="font-bold text-uai-navy mb-1.5">{step.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 px-4 bg-gradient-to-br from-uai-navy-dark to-uai-navy text-white text-center overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.02%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%221.5%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] pointer-events-none" />
        <div className="relative max-w-2xl mx-auto">
          <CheckCircle className="w-12 h-12 text-amber-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">¿Listo para enviar tu proyecto?</h2>
          <p className="text-blue-300 mb-10 text-lg leading-relaxed">
            El proceso toma menos de 10 minutos. La IA gratuita te ayudará a
            preparar mejor tu envío antes de que llegue al comité.
          </p>
          <Link
            href="/submit"
            className="group inline-flex items-center gap-2 bg-uai-gold hover:bg-uai-gold-hover text-uai-navy font-bold px-10 py-4 rounded-xl transition-all shadow-lg shadow-amber-500/20 hover:-translate-y-0.5"
          >
            Comenzar ahora
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
}
