import { getSupabase, isConfigured } from "@/lib/supabase";
import { sections as allSections } from "@/lib/sections";
import StatusBadge from "@/components/StatusBadge";
import ResubmitForm from "@/components/ResubmitForm";
import { CheckCircle, Clock, FileSearch, AlertCircle, XCircle, ArrowRight, ClipboardList, Award } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";

const statusSteps = [
  { key: "submitted",   label: "Recibido",           icon: Clock },
  { key: "reviewing",   label: "En revisión",         icon: FileSearch },
  { key: "corrections", label: "Con observaciones",   icon: AlertCircle },
  { key: "approved",    label: "Aprobado",            icon: CheckCircle },
  { key: "certified",   label: "Certificado emitido", icon: Award },
];

const statusOrder = ["submitted", "reviewing", "corrections", "approved", "certified", "rejected"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default async function TrackPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  if (!isConfigured) {
    return <NotFound code={code} message="Base de datos no configurada." />;
  }

  const cookieStore = await cookies();
  const isReviewer = !!cookieStore.get("comite_email")?.value;

  const supabase = getSupabase();
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("tracking_code", code.toUpperCase())
    .single();

  if (!project) return <NotFound code={code} />;

  const isRejected    = project.status === "rejected";
  const isCorrections = project.status === "corrections";
  const currentStep   = statusOrder.indexOf(project.status);

  // Fetch reviewer corrections if status is 'corrections'
  let correctionsByReviewer: {
    reviewer_name: string;
    sections: { label: string; standardComments: string[]; customComment: string }[];
  }[] = [];

  if (isCorrections) {
    const { data: reviews } = await supabase
      .from("reviews")
      .select("id, reviewer_name, overall_decision")
      .eq("project_id", project.id)
      .eq("round", project.current_round ?? 1)
      .eq("overall_decision", "corrections");

    if (reviews && reviews.length > 0) {
      const { data: sectionReviews } = await supabase
        .from("section_reviews")
        .select("review_id, section_key, decision, standard_comments, custom_comment")
        .in("review_id", reviews.map((r) => r.id))
        .eq("decision", "corrections");

      correctionsByReviewer = reviews.map((r) => ({
        reviewer_name: r.reviewer_name,
        sections: (sectionReviews ?? [])
          .filter((sr) => sr.review_id === r.id)
          .map((sr) => ({
            label: allSections.find((s) => s.key === sr.section_key)?.label ?? sr.section_key,
            standardComments: sr.standard_comments ?? [],
            customComment: sr.custom_comment ?? "",
          }))
          .filter((s) => s.standardComments.length > 0 || s.customComment),
      })).filter((r) => r.sections.length > 0);
    }
  }

  return (
    <div className="min-h-[80vh] bg-slate-50 px-4 py-14">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs font-bold text-[#CC5200] uppercase tracking-widest mb-2">Seguimiento de proyecto</p>
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">Estado de revisión</h1>
          <p className="text-slate-400 text-sm">Código: <span className="font-mono font-bold text-[#1A1A1A]">{code.toUpperCase()}</span></p>
        </div>

        {/* Status card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-6">
          <div className={`h-1.5 w-full ${
            project.status === "certified"   ? "bg-violet-500" :
            project.status === "approved"    ? "bg-emerald-500" :
            project.status === "rejected"    ? "bg-red-400" :
            project.status === "reviewing"   ? "bg-blue-400" :
            project.status === "corrections" ? "bg-orange-400" : "bg-slate-300"
          }`} />

          <div className="p-8">
            <h2 className="font-bold text-[#1A1A1A] text-lg leading-snug mb-1">{project.title}</h2>
            <p className="text-slate-400 text-sm mb-3">
              {project.researcher_name}
              {project.advisor_name && (
                <span className="text-slate-400"> · Guía: <span className="font-medium text-slate-600">{project.advisor_name}</span></span>
              )}
              {" · "}Enviado el {formatDate(project.created_at)}
              {project.current_round && project.current_round > 1
                ? ` · Ronda ${project.current_round}`
                : ""}
            </p>
            {/* Funding badge */}
            {project.funding_type && project.funding_type !== "none" && (
              <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
                <span>{project.funding_type === "fondecyt" ? "📋 Fondecyt" : "🏛️ Grant / Proyecto docente UAI"}</span>
                {project.funding_folio && (
                  <span className="bg-violet-200 text-violet-800 px-1.5 py-0.5 rounded font-mono">
                    Folio {project.funding_folio}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mb-2">
              <StatusBadge status={project.status} />
              <span className="text-sm font-bold text-slate-500">{project.progress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mb-8">
              <div
                className={`h-2 rounded-full transition-all ${
                  project.status === "certified"  ? "bg-violet-500" :
                  project.status === "approved"   ? "bg-emerald-500" :
                  project.status === "rejected"   ? "bg-red-400" :
                  project.status === "reviewing"  ? "bg-blue-400" : "bg-orange-400"
                }`}
                style={{ width: `${project.progress}%` }}
              />
            </div>

            {/* Timeline */}
            {!isRejected ? (
              <div className="space-y-3 mb-8">
                {statusSteps.map((step) => {
                  const done   = statusOrder.indexOf(step.key) <= currentStep;
                  const active = step.key === project.status;
                  return (
                    <div key={step.key} className={`flex items-center gap-3 p-3 rounded-xl ${
                      active ? "bg-[#1A1A1A] text-white" :
                      done   ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-400"
                    }`}>
                      <step.icon className={`w-4 h-4 shrink-0 ${active ? "text-[#CC5200]" : done ? "text-emerald-500" : ""}`} />
                      <span className="text-sm font-medium">{step.label}</span>
                      {done && !active && <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto" />}
                      {active && <ArrowRight className="w-4 h-4 text-[#CC5200] ml-auto" />}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl p-4 mb-8">
                <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <p className="font-semibold text-red-700 text-sm">Proyecto no aprobado</p>
                  <p className="text-red-500 text-xs mt-0.5">Contacta al comité para más detalles.</p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Corrections detail */}
        {isCorrections && correctionsByReviewer.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 mb-6">
            <p className="text-sm font-bold text-[#CC5200] uppercase tracking-wide mb-4">Observaciones de los revisores</p>
            <div className="space-y-5">
              {correctionsByReviewer.map((r) => (
                <div key={r.reviewer_name}>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">{r.reviewer_name}</p>
                  <div className="space-y-3">
                    {r.sections.map((s) => (
                      <div key={s.label} className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                        <p className="text-sm font-bold text-[#1A1A1A] mb-2">📌 {s.label}</p>
                        {s.standardComments.map((c, i) => (
                          <p key={i} className="text-sm text-slate-600 ml-2 mb-1">• {c}</p>
                        ))}
                        {s.customComment && (
                          <p className="text-sm text-slate-500 ml-2 italic mt-1">"{s.customComment}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Re-upload section */}
        {isCorrections && (
          <div className="mb-6">
            <ResubmitForm
              projectId={project.id}
              currentRound={project.current_round ?? 1}
            />
          </div>
        )}

        {/* Reviewer action button */}
        {isReviewer && (
          <div className="mb-6">
            <Link
              href={`/revisores/review/${project.id}`}
              className="flex items-center justify-center gap-2.5 w-full bg-uai-navy hover:bg-uai-navy-dark text-white font-semibold px-6 py-3.5 rounded-2xl transition-colors text-sm shadow-sm"
            >
              <ClipboardList className="w-4 h-4" />
              Revisar este proyecto
            </Link>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 leading-relaxed">
          Esta página se actualiza automáticamente con cada cambio de estado.<br />
          Guarda tu código <span className="font-mono font-bold">{code.toUpperCase()}</span> para consultas futuras.
        </p>
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-[#CC5200] hover:underline font-medium">
            ← Volver al portal
          </Link>
        </div>
      </div>
    </div>
  );
}

function NotFound({ code, message }: { code: string; message?: string }) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <FileSearch className="w-8 h-8 text-slate-300" />
        </div>
        <h1 className="text-xl font-bold text-[#1A1A1A] mb-2">Código no encontrado</h1>
        <p className="text-slate-400 text-sm mb-8">
          {message ?? `No existe ningún proyecto con el código "${code.toUpperCase()}".`}
        </p>
        <Link href="/" className="bg-[#1A1A1A] text-white font-semibold px-6 py-3 rounded-xl text-sm hover:bg-black transition-colors inline-block">
          Ir al portal
        </Link>
      </div>
    </div>
  );
}
