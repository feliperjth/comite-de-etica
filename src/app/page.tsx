import Link from "next/link";
import { FileText, Bot, BarChart3, Users, Heart, Shield, ArrowRight, CheckCircle, ExternalLink, BookOpen, User, ClipboardList } from "lucide-react";

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


export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-uai-navy-dark via-uai-navy to-uai-navy-light text-white py-28 px-4 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full -translate-y-1/3 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full translate-y-1/3 -translate-x-1/3 pointer-events-none" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.02%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%221.5%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 text-amber-300 text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
            Escuela de Psicología · Universidad Adolfo Ibáñez
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 tracking-tight">
            Portal del<br />
            <span className="text-amber-400">Comité de Ética</span>
          </h1>
          <p className="text-blue-200 text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            Plataforma oficial para el envío, seguimiento y revisión ética de
            proyectos de investigación en psicología.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/submit"
              className="group flex items-center gap-2 bg-uai-gold hover:bg-uai-gold-hover text-uai-navy font-bold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:-translate-y-0.5"
            >
              Enviar mi proyecto
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/track"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-3.5 rounded-xl transition-all border border-white/15 hover:-translate-y-0.5"
            >
              Seguimiento
            </Link>
            <Link
              href="/comite"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-3.5 rounded-xl transition-all border border-white/15 hover:-translate-y-0.5"
            >
              Revisar proyectos
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "120+", label: "Proyectos revisados" },
            { value: "94%",  label: "Tasa de aprobación" },
            { value: "~12 días", label: "Tiempo promedio de revisión" },
            { value: "8",    label: "Revisores especializados" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-bold text-uai-navy">{s.value}</div>
              <div className="text-slate-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Profile selector */}
      <section className="bg-white border-b border-slate-100 py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
            Accede a tu perfil
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Investigador */}
            <Link
              href="/investigador"
              className="group flex items-center gap-5 bg-white hover:bg-blue-50 border-2 border-slate-200 hover:border-blue-400 rounded-2xl p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="w-14 h-14 bg-blue-50 group-hover:bg-blue-100 rounded-2xl flex items-center justify-center shrink-0 transition-colors">
                <User className="w-7 h-7 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-uai-navy text-base mb-0.5">Soy Investigador</h3>
                <p className="text-slate-400 text-sm">Ver mis proyectos enviados y su estado</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>

            {/* Revisor */}
            <Link
              href="/revisores"
              className="group flex items-center gap-5 bg-white hover:bg-emerald-50 border-2 border-slate-200 hover:border-emerald-500 rounded-2xl p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="w-14 h-14 bg-emerald-50 group-hover:bg-emerald-100 rounded-2xl flex items-center justify-center shrink-0 transition-colors">
                <ClipboardList className="w-7 h-7 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-uai-navy text-base mb-0.5">Soy Revisor</h3>
                <p className="text-slate-400 text-sm">Acceder al panel de revisión de proyectos</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>

            {/* Comité */}
            <Link
              href="/comite"
              className="group flex items-center gap-5 bg-white hover:bg-orange-50 border-2 border-slate-200 hover:border-[#CC5200] rounded-2xl p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="w-14 h-14 bg-uai-navy group-hover:bg-uai-navy-dark rounded-2xl flex items-center justify-center shrink-0 transition-colors shadow-sm">
                <Shield className="w-7 h-7 text-uai-gold" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-uai-navy text-base mb-0.5">Soy Miembro del Comité</h3>
                <p className="text-slate-400 text-sm">Ver proyectos asignados e historial de revisiones</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-[#CC5200] group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          </div>
        </div>
      </section>

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
