import { Download, FileText, FileCheck, Users, ClipboardList, BarChart2, UserCircle } from "lucide-react";
import { getSupabase, isConfigured } from "@/lib/supabase";

type DocTemplate = {
  id: string;
  label: string;
  description: string;
  required: boolean;
  icon: React.ComponentType<{ className?: string }>;
  url: string | null;
};

const docDefinitions = [
  {
    id: "protocol",
    label: "Protocolo de investigación",
    description: "Plantilla oficial para describir objetivos, metodología, participantes y procedimientos del estudio.",
    required: true,
    icon: FileText,
  },
  {
    id: "consent",
    label: "Formulario de consentimiento informado",
    description: "Modelo de consentimiento informado para participantes adultos.",
    required: true,
    icon: FileCheck,
  },
  {
    id: "assent",
    label: "Formulario de asentimiento (menores de edad)",
    description: "Modelo de asentimiento informado para participantes menores de 18 años.",
    required: false,
    icon: Users,
  },
  {
    id: "instruments",
    label: "Instrumentos de evaluación",
    description: "Plantilla para registrar cuestionarios, escalas o pruebas utilizadas en la investigación.",
    required: false,
    icon: ClipboardList,
  },
  {
    id: "timeline",
    label: "Cronograma / Carta Gantt",
    description: "Formato de planificación temporal del proyecto de investigación.",
    required: false,
    icon: BarChart2,
  },
  {
    id: "cv",
    label: "CV investigador principal",
    description: "Formato de curriculum vitae requerido para el investigador responsable.",
    required: true,
    icon: UserCircle,
  },
];

async function getDocumentUrls(): Promise<Record<string, string>> {
  if (!isConfigured) return {};
  try {
    const supabase = getSupabase();
    const { data } = await supabase.storage.from("templates").list("", { limit: 50 });
    if (!data) return {};

    const urls: Record<string, string> = {};
    for (const file of data) {
      const { data: urlData } = supabase.storage.from("templates").getPublicUrl(file.name);
      const docId = file.name.replace(/\.[^.]+$/, ""); // strip extension
      urls[docId] = urlData.publicUrl;
    }
    return urls;
  } catch {
    return {};
  }
}

export default async function DocumentosPage() {
  const urls = await getDocumentUrls();

  const docs: DocTemplate[] = docDefinitions.map((d) => ({
    ...d,
    url: urls[d.id] ?? null,
  }));

  const available = docs.filter((d) => d.url).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-bold text-[#CC5200] uppercase tracking-widest mb-2">Comité de Ética · UAI</p>
        <h1 className="text-3xl font-bold text-uai-navy mb-2">Documentos requeridos</h1>
        <p className="text-slate-500 text-sm max-w-2xl">
          Descarga las plantillas oficiales del Comité de Ética para preparar tu envío.
          Los documentos marcados con <span className="text-red-400 font-semibold">*</span> son obligatorios.
        </p>
        {available > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            {available} documento{available !== 1 ? "s" : ""} disponible{available !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Documents grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {docs.map((doc) => {
          const Icon = doc.icon;
          return (
            <div
              key={doc.id}
              className={`bg-white rounded-2xl border shadow-sm p-6 flex flex-col gap-4 transition-all ${
                doc.url ? "border-slate-100 hover:shadow-md hover:-translate-y-0.5" : "border-slate-100 opacity-70"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  doc.url ? "bg-uai-navy" : "bg-slate-100"
                }`}>
                  <Icon className={`w-5 h-5 ${doc.url ? "text-uai-gold" : "text-slate-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-800 text-sm leading-snug">
                      {doc.label}
                      {doc.required && <span className="text-red-400 ml-1">*</span>}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{doc.description}</p>
                </div>
              </div>

              {doc.url ? (
                <a
                  href={doc.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-uai-navy hover:bg-uai-navy-dark text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
                >
                  <Download className="w-4 h-4" /> Descargar
                </a>
              ) : (
                <div className="flex items-center justify-center gap-2 bg-slate-100 text-slate-400 text-sm px-4 py-2.5 rounded-xl cursor-not-allowed select-none">
                  <Download className="w-4 h-4" /> Próximamente
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Upload instructions for admin */}
      <div className="mt-10 bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-2">Para el coordinador del comité</p>
        <p className="text-sm text-amber-800 leading-relaxed">
          Para activar los botones de descarga, sube los archivos al bucket <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">templates</code> en Supabase Storage.
          El nombre del archivo determina qué plantilla activa:
        </p>
        <ul className="mt-3 space-y-1 text-xs font-mono text-amber-700">
          {docDefinitions.map((d) => (
            <li key={d.id}>· <strong>{d.id}</strong>.pdf / .docx → {d.label}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
