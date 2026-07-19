"use client";

import { useState, useEffect } from "react";
import { Check, Upload, Sparkles, Send, ChevronRight, ChevronLeft, FileText, X, Loader2, ArrowRight, Download } from "lucide-react";
import Link from "next/link";
import { themes } from "@/lib/themes";
import { isConfigured, getSupabase } from "@/lib/supabase";
import { safeStorageName } from "@/lib/storage";
import AiSectionReviewer from "@/components/AiSectionReviewer";

type ProjectType = "pregrado" | "magister" | "doctorado" | "docente" | "fondecyt" | "externo" | "";
type FileMap = Record<string, File | null>;

type FundingType = "none" | "fondecyt" | "grant_uai" | "";

interface FormData {
  name: string;
  rut: string;
  email: string;
  role: string;
  projectTitle: string;
  projectType: ProjectType;
  abstract: string;
  advisorName: string;
  fundingType: FundingType;
  fundingFolio: string;
  fundingDetail: string;
}

const requiredDocs = [
  { id: "protocol",    label: "Protocolo de investigación",                 required: true,  hint: "Obligatorio"                                   },
  { id: "consent",     label: "Consentimiento informado",                   required: false, hint: "Obligatorio uno: consentimiento o asentimiento" },
  { id: "assent",      label: "Asentimiento informado",                     required: false, hint: "Obligatorio uno: consentimiento o asentimiento" },
  { id: "instruments", label: "Instrumentos / tests a utilizar",            required: false, hint: "Opcional"                                       },
];

const stepLabels = ["Información", "Temática", "Documentos", "Revisión IA", "Confirmar"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center mb-10 overflow-x-auto pb-2">
      {stepLabels.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center min-w-[60px]">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                done   ? "bg-emerald-500 text-white shadow-md shadow-emerald-200" :
                active ? "bg-uai-navy text-white shadow-md shadow-blue-200 ring-4 ring-blue-100" :
                         "bg-slate-100 text-slate-400"
              }`}>
                {done ? <Check className="w-5 h-5" /> : step}
              </div>
              <span className={`text-xs mt-1.5 font-medium whitespace-nowrap ${
                active ? "text-uai-navy" : done ? "text-emerald-600" : "text-slate-400"
              }`}>
                {label}
              </span>
            </div>
            {i < stepLabels.length - 1 && (
              <div className={`w-12 md:w-20 h-0.5 mx-1 mb-5 transition-all duration-500 ${done ? "bg-emerald-400" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const inputClass = "w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";

const PROFESSORS = [
  "Claudia Cruzat",
  "David Huepe",
  "David Martínez",
  "Claudio Araya",
  "Emilio Compte",
  "María Josefina Escobar",
  "Gonzalo Muñoz",
  "María Teresa Ropert",
  "Constanza Baquedano",
  "Carla Ugarte",
  "Fernanda Díaz",
  "Vicente Soto",
  "Felipe Rojas",
  "Felipe Landaeta",
  "Lorna Cortés",
  "Felipe Valdivieso",
  "Ana Rosenbluth",
  "Paula Cornejo",
  "Paulina Ortiz",
  "Daniela Castillo",
  "Carla Boattini",
  "Gonzalo de la Fuente",
  "Carolina Panesso",
  "Andrés Salas",
  "Isidora Paiva",
  "Agustín Ibáñez",
  "Claudia Durán-Aniotz",
];

export default function SubmitPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({ name: "", rut: "", email: "", role: "", projectTitle: "", projectType: "", abstract: "", advisorName: "", fundingType: "", fundingFolio: "", fundingDetail: "" });
  const [advisorSelect, setAdvisorSelect] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("");
  const [files, setFiles] = useState<FileMap>({});
  const [reviewText, setReviewText] = useState("");
  const [reviewResult, setReviewResult] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewTab, setReviewTab] = useState<"general" | "seccion">("general");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [missingWarning, setMissingWarning] = useState<string[]>([]);

  const update = (field: keyof FormData, value: string) => setForm((p) => ({ ...p, [field]: value }));
  const handleFile = (id: string, file: File | null) => setFiles((p) => ({ ...p, [id]: file }));

  // Pre-fill name + email from session if logged in
  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((me) => {
      if (me.type === "investigador") {
        setForm((p) => ({
          ...p,
          name:  p.name  || me.name  || "",
          email: p.email || me.email || "",
        }));
      }
    }).catch(() => {});
  }, []);

  // El/la profesor/a guía es obligatorio/a para tesis (pregrado/magíster/doctorado)
  // y también para estudiantes (pre/postgrado) aunque su proyecto NO sea una tesis y
  // figuren como investigador/a principal: un trabajo estudiantil siempre lleva guía UAI.
  const isThesisType  = ["pregrado", "magister", "doctorado"].includes(form.projectType);
  const isStudentRole = ["estudiante_pregrado", "estudiante_postgrado"].includes(form.role);
  const needsAdvisor  = isThesisType || isStudentRole;
  const canAdvance1 = !!(
    form.name && form.email && form.projectTitle && form.projectType &&
    (!needsAdvisor || form.advisorName.trim())
  );
  const canAdvance2 = selectedTheme !== "";
  const requiredUploaded = !!files["protocol"] && (!!files["consent"] || !!files["assent"]);

  async function handleAIReview() {
    setIsReviewing(true);
    setReviewResult("");
    setReviewError("");
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reviewText || form.abstract, title: form.projectTitle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReviewResult(data.review);
    } catch (e: unknown) {
      setReviewError(e instanceof Error ? e.message : "Error al conectar con el servicio.");
    } finally {
      setIsReviewing(false);
    }
  }

  function generateTrackingCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "CE-";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const code = generateTrackingCode();

      if (isConfigured) {
        const supabase = getSupabase();

        // 1. Guardar proyecto en base de datos
        const { data: project, error: projectError } = await supabase
          .from("projects")
          .insert({
            title: form.projectTitle,
            researcher_name: form.name,
            researcher_rut: form.rut || null,
            researcher_email: form.email,
            researcher_role: form.role || null,
            project_type: form.projectType,
            theme: selectedTheme,
            abstract: form.abstract || null,
            status: "submitted",
            progress: 10,
            tracking_code: code,
            advisor_name:   form.advisorName   || null,
            funding_type:   form.fundingType   || null,
            funding_folio:  form.fundingFolio  || null,
            funding_detail: form.fundingDetail || null,
          })
          .select()
          .single();

        if (projectError) throw projectError;

        // 2. Subir archivos a Storage
        // La CLAVE de Storage se sanea (Supabase rechaza tildes/ñ/etc. con
        // "Invalid key"); el nombre original se conserva en file_name.
        const failedUploads: string[] = [];
        for (const [docType, file] of Object.entries(files)) {
          if (!file) continue;
          const path = `${project.id}/${docType}/${safeStorageName(file.name)}`;

          // Try upload; if file already exists at path, remove and re-upload
          let { error: uploadError } = await supabase.storage
            .from("documents")
            .upload(path, file);

          if (uploadError && uploadError.message?.includes("already exists")) {
            await supabase.storage.from("documents").remove([path]);
            const retry = await supabase.storage.from("documents").upload(path, file);
            uploadError = retry.error;
          }

          const filePath = uploadError ? null : path;
          if (uploadError) {
            console.warn(`Upload failed for ${docType}:`, uploadError.message);
            failedUploads.push(file.name);
          }

          await supabase.from("documents").insert({
            project_id: project.id,
            doc_type:   docType,
            file_name:  file.name,
            file_path:  filePath,
          });
        }

        // 3. Enviar correo de confirmación. Solo se manda el id: el servidor
        // lee de la base los datos que van en el correo.
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id }),
        });

        // 4. Sincronizar con Google Drive (en segundo plano, no bloquea)
        fetch(`/api/projects/${project.id}/sync-drive`, { method: "POST" }).catch(() => {});

        // 5. Si alguna subida falló, el proyecto queda con documentos
        // faltantes: avisar al investigador por correo y mostrar advertencia
        // (no se finge éxito completo, pero tampoco se pierde el envío).
        if (failedUploads.length > 0) {
          setMissingWarning(failedUploads);
          fetch(`/api/projects/${project.id}/notify-missing-docs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          }).catch(() => {});
        }
      }

      setTrackingCode(code);
      setSubmitted(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message
        : (typeof e === "object" && e !== null && "message" in e) ? String((e as {message:unknown}).message)
        : JSON.stringify(e);
      setSubmitError(msg || "Error al enviar el proyecto. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-uai-navy mb-2">¡Proyecto enviado!</h2>
          <p className="text-slate-500 text-sm mb-6">
            Revisa tu correo <span className="font-medium text-slate-700">{form.email}</span> — te enviamos un enlace de seguimiento.
          </p>

          {/* Tracking code */}
          <div className="bg-[#1A1A1A] rounded-2xl p-6 mb-6">
            <p className="text-xs font-bold text-[#CC5200] uppercase tracking-widest mb-2">Tu código de seguimiento</p>
            <p className="text-3xl font-bold text-white tracking-[6px] mb-4">{trackingCode}</p>
            <a
              href={`/track/${trackingCode}`}
              className="inline-flex items-center gap-2 bg-[#CC5200] hover:bg-[#B34700] text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-colors"
            >
              Ver estado del proyecto <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {missingWarning.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-left">
              <p className="text-sm font-semibold text-amber-800 mb-1">Algunos archivos no se subieron</p>
              <p className="text-xs text-amber-700/90 leading-relaxed">
                No se pudieron guardar: <strong>{missingWarning.join(", ")}</strong>.
                Te enviamos un correo con un enlace para volver a subirlos, o hazlo
                ahora desde <span className="font-medium">Ver estado del proyecto</span> →
                recuadro &quot;Documentos faltantes&quot;.
              </p>
            </div>
          )}

          <p className="text-xs text-slate-400 leading-relaxed">
            Guarda este código. Puedes consultar el estado en cualquier momento en <span className="font-medium">/track/{trackingCode}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-uai-navy mb-2">Enviar Proyecto</h1>
        <p className="text-slate-500">Completa los 5 pasos para enviar tu investigación al Comité de Ética</p>
      </div>

      <StepIndicator current={step} />

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-10">

        {/* PASO 1 */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-uai-navy mb-1">Información del investigador</h2>
            <p className="text-slate-400 text-sm mb-5">Ingresa tus datos y los del proyecto que deseas someter.</p>

            {/* Documents banner */}
            <Link
              href="/documentos"
              target="_blank"
              className="flex items-center gap-4 bg-uai-navy/5 hover:bg-uai-navy/10 border border-uai-navy/20 rounded-2xl px-5 py-4 mb-8 transition-colors group"
            >
              <div className="w-10 h-10 bg-uai-navy rounded-xl flex items-center justify-center shrink-0">
                <Download className="w-5 h-5 text-uai-gold" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-uai-navy text-sm">Descarga las plantillas del comité</p>
                <p className="text-xs text-slate-500 mt-0.5">Protocolo, consentimiento informado, CV y más — antes de completar el formulario</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-uai-navy group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre completo <span className="text-red-400">*</span></label>
                <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="María González Pérez" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">RUT <span className="text-red-400">*</span></label>
                <input type="text" value={form.rut} onChange={(e) => update("rut", e.target.value)} placeholder="12.345.678-9" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Correo institucional <span className="text-red-400">*</span></label>
                <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="nombre@uai.cl" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Rol</label>
                <select value={form.role} onChange={(e) => update("role", e.target.value)} className={inputClass}>
                  <option value="">Seleccionar...</option>
                  <option value="estudiante_pregrado">Estudiante de pregrado</option>
                  <option value="estudiante_postgrado">Estudiante de postgrado</option>
                  <option value="academico">Académico / Investigador</option>
                  <option value="externo">Investigador externo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de proyecto <span className="text-red-400">*</span></label>
                <select value={form.projectType} onChange={(e) => update("projectType", e.target.value as ProjectType)} className={inputClass}>
                  <option value="">Seleccionar...</option>
                  <option value="pregrado">Tesis de pregrado</option>
                  <option value="magister">Tesis de magíster</option>
                  <option value="doctorado">Tesis de doctorado</option>
                  <option value="docente">Proyecto de investigación docente</option>
                  <option value="fondecyt">Proyecto Fondecyt</option>
                  <option value="externo">Consultoría / Estudio externo</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Título del proyecto <span className="text-red-400">*</span></label>
                <input type="text" value={form.projectTitle} onChange={(e) => update("projectTitle", e.target.value)} placeholder="Título completo de tu investigación" className={inputClass} />
              </div>
              {/* Profesor/a guía — tesis o estudiante (pre/postgrado), aunque no sea tesis */}
              {needsAdvisor && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Profesor/a guía UAI <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={advisorSelect}
                    onChange={(e) => {
                      setAdvisorSelect(e.target.value);
                      if (e.target.value !== "otro") update("advisorName", e.target.value);
                      else update("advisorName", "");
                    }}
                    className={inputClass}
                  >
                    <option value="">Selecciona un/a profesor/a guía…</option>
                    {PROFESSORS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                    <option value="otro">Otro/a (no está en la lista)</option>
                  </select>
                  {advisorSelect === "otro" && (
                    <input
                      type="text"
                      value={form.advisorName}
                      onChange={(e) => update("advisorName", e.target.value)}
                      placeholder="Escribe el nombre completo del/la profesor/a guía"
                      className={`${inputClass} mt-2`}
                    />
                  )}
                  <p className="text-xs text-slate-400 mt-1.5">
                    Nombre del profesor/a guía asociado/a a la UAI.
                    {isStudentRole && !isThesisType && " Obligatorio para estudiantes, aunque figures como investigador/a principal."}
                  </p>
                  {needsAdvisor && !form.advisorName.trim() && (
                    <p className="text-amber-600 text-xs mt-1.5 flex items-center gap-1.5">
                      <span>⚠</span> Debes indicar el/la profesor/a guía para continuar.
                    </p>
                  )}
                </div>
              )}

              {/* Funding — only for thesis types */}
              {["pregrado", "magister", "doctorado"].includes(form.projectType) && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    ¿Esta tesis está asociada a un proyecto de financiamiento?
                  </label>
                  <div className="flex flex-wrap gap-3 mb-3">
                    {[
                      { value: "none",       label: "No, es independiente" },
                      { value: "fondecyt",   label: "Fondecyt" },
                      { value: "grant_uai",  label: "Grant / Proyecto docente UAI" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => update("fundingType", opt.value as FundingType)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                          form.fundingType === opt.value
                            ? "border-blue-500 bg-blue-50 text-blue-800"
                            : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {(form.fundingType === "fondecyt" || form.fundingType === "grant_uai") && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Folio del {form.fundingType === "fondecyt" ? "Fondecyt" : "grant"} al que está afiliada esta tesis <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.fundingFolio}
                        onChange={(e) => update("fundingFolio", e.target.value)}
                        placeholder={form.fundingType === "fondecyt" ? "Ej: 1230456" : "Ej: UAI-2024-045"}
                        className={inputClass}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Resumen del proyecto</label>
                <textarea value={form.abstract} onChange={(e) => update("abstract", e.target.value)} rows={4} placeholder="Describe brevemente los objetivos, participantes y metodología..." className={`${inputClass} resize-none`} />
                <p className="text-xs text-slate-400 mt-1.5">Este resumen se usará en la revisión IA del paso 4.</p>
              </div>
            </div>
          </div>
        )}

        {/* PASO 2 */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-uai-navy mb-1">Temática de investigación</h2>
            <p className="text-slate-400 text-sm mb-8">Selecciona el área que mejor describe tu investigación para asignar el revisor más adecuado.</p>
            <div className="grid md:grid-cols-2 gap-3">
              {themes.map((t) => (
                <button key={t.id} onClick={() => setSelectedTheme(t.id)}
                  className={`text-left p-4 rounded-2xl border-2 transition-all ${selectedTheme === t.id ? "border-blue-600 bg-blue-50 shadow-sm" : "border-slate-200 hover:border-blue-300 bg-white hover:bg-slate-50"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{t.emoji}</span>
                    <span className={`font-semibold text-sm ${selectedTheme === t.id ? "text-blue-900" : "text-slate-700"}`}>{t.label}</span>
                  </div>
                  <div className="text-xs text-slate-400 pl-7">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO 3 */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold text-uai-navy mb-1">Documentos requeridos</h2>
            <p className="text-slate-400 text-sm mb-5">Sube los documentos del comité. Los marcados con <span className="text-red-400 font-semibold">*</span> son obligatorios.</p>

            {/* Download templates */}
            <Link
              href="/documentos"
              target="_blank"
              className="flex items-center gap-4 bg-uai-navy/5 hover:bg-uai-navy/10 border border-uai-navy/20 rounded-2xl px-5 py-4 mb-6 transition-colors group"
            >
              <div className="w-10 h-10 bg-uai-navy rounded-xl flex items-center justify-center shrink-0">
                <Download className="w-5 h-5 text-uai-gold" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-uai-navy text-sm">¿Aún no tienes los documentos?</p>
                <p className="text-xs text-slate-500 mt-0.5">Descarga aquí las plantillas oficiales del comité para rellenarlas y subirlas</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-uai-navy group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
            <div className="space-y-3">
              {requiredDocs.map((doc) => (
                <div key={doc.id} className={`border rounded-2xl p-4 transition-all ${files[doc.id] ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {files[doc.id]
                        ? <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center"><Check className="w-4 h-4 text-emerald-600" /></div>
                        : <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center"><Upload className="w-4 h-4 text-slate-400" /></div>
                      }
                      <span className="font-medium text-slate-700 text-sm">{doc.label}{doc.required && <span className="text-red-400 ml-1">*</span>}</span>
                    </div>
                    {files[doc.id] && (
                      <button onClick={() => handleFile(doc.id, null)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {files[doc.id]
                    ? <p className="text-xs text-emerald-600 mt-2 pl-9">{files[doc.id]!.name}</p>
                    : <label className="mt-3 block pl-9 cursor-pointer">
                        <span className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Seleccionar archivo (PDF o Word)
                        </span>
                        <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => handleFile(doc.id, e.target.files?.[0] ?? null)} />
                      </label>
                  }
                </div>
              ))}
            </div>
            {!requiredUploaded && (
              <p className="text-amber-600 text-xs mt-5 flex items-center gap-1.5">
                <span>⚠</span>
                {!files["protocol"]
                  ? "Debes subir el protocolo de investigación."
                  : "Debes subir al menos el consentimiento o el asentimiento informado."}
              </p>
            )}
          </div>
        )}

        {/* PASO 4 */}
        {step === 4 && (
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-violet-600" />
              </div>
              <h2 className="text-xl font-bold text-uai-navy">Revisión ética con IA</h2>
            </div>
            <p className="text-slate-400 text-sm mb-5 ml-12">Análisis gratuito antes del envío formal. Este paso es opcional pero recomendado.</p>

            {/* Tabs */}
            <div className="flex bg-slate-100 rounded-xl p-1 mb-6 gap-1">
              <button
                onClick={() => setReviewTab("general")}
                className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-colors ${reviewTab === "general" ? "bg-white text-uai-navy shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Análisis general
              </button>
              <button
                onClick={() => setReviewTab("seccion")}
                className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-colors ${reviewTab === "seccion" ? "bg-white text-uai-navy shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Por sección
              </button>
            </div>

            {/* Tab: Análisis general */}
            {reviewTab === "general" && (
              <div>
                <div className="flex gap-2 mb-5">
                  {[["👤","Autonomía"],["❤️","Beneficencia"],["⚖️","Justicia"]].map(([icon,name]) => (
                    <span key={name} className="flex items-center gap-1.5 text-xs bg-violet-50 text-violet-700 border border-violet-100 px-3 py-1.5 rounded-full font-semibold">
                      <span>{icon}</span>{name}
                    </span>
                  ))}
                </div>
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Texto para analizar <span className="text-slate-400 font-normal">(puedes editar el resumen del paso 1)</span>
                  </label>
                  <textarea value={reviewText || form.abstract} onChange={(e) => setReviewText(e.target.value)} rows={6}
                    placeholder="Incluye resumen, objetivos, participantes y metodología..." className={`${inputClass} resize-none`} />
                </div>
                <button onClick={handleAIReview} disabled={isReviewing || !(reviewText || form.abstract)}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm shadow-sm">
                  {isReviewing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analizando...</> : <><Sparkles className="w-4 h-4" /> Analizar con IA gratuita</>}
                </button>
                {reviewError && <div className="mt-5 bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700"><strong>Error:</strong> {reviewError}</div>}
                {reviewResult && (
                  <div className="mt-6 bg-gradient-to-br from-violet-50 to-white border border-violet-200 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-4 h-4 text-violet-600" />
                      <h3 className="font-bold text-uai-navy text-sm uppercase tracking-wide">Resultado del análisis ético</h3>
                    </div>
                    <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{reviewResult}</div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Por sección */}
            {reviewTab === "seccion" && (
              <AiSectionReviewer projectTitle={form.projectTitle} />
            )}

            {!reviewResult && !reviewError && reviewTab === "general" && (
              <div className="mt-5 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
                <span className="font-semibold">Este paso es opcional pero recomendado.</span> La revisión IA no reemplaza al comité, pero te ayuda a identificar aspectos éticos a fortalecer.
              </div>
            )}
          </div>
        )}

        {/* PASO 5 */}
        {step === 5 && (
          <div>
            <h2 className="text-xl font-bold text-uai-navy mb-1">Confirmar y enviar</h2>
            <p className="text-slate-400 text-sm mb-8">Revisa la información antes de enviar al comité.</p>
            <div className="space-y-4 mb-8">
              <div className="bg-slate-50 rounded-2xl p-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Investigador</h3>
                <p className="font-semibold text-slate-800">{form.name}</p>
                <p className="text-slate-500 text-sm">{form.email}</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Proyecto</h3>
                <p className="font-semibold text-slate-800">{form.projectTitle}</p>
                <p className="text-slate-500 text-sm">{themes.find((t) => t.id === selectedTheme)?.label} · {form.projectType}</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Documentos</h3>
                <ul className="space-y-1.5">
                  {requiredDocs.map((d) => files[d.id] ? (
                    <li key={d.id} className="flex items-center gap-2 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" /> {files[d.id]!.name}
                    </li>
                  ) : null)}
                </ul>
              </div>
            </div>
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 mb-5">
                <strong>Error:</strong> {submitError}
              </div>
            )}
            <p className="text-slate-400 text-xs leading-relaxed">
              Al enviar confirmas que la información proporcionada es verídica y que el proyecto cumple con las normativas éticas de la Escuela de Psicología UAI.
            </p>
          </div>
        )}

        {/* Navegación */}
        <div className="flex justify-between mt-10 pt-6 border-t border-slate-100">
          <button onClick={() => setStep((s) => (s - 1) as typeof step)}
            className={`flex items-center gap-2 text-slate-500 hover:text-slate-700 font-medium text-sm transition-colors ${step === 1 ? "invisible" : ""}`}>
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>
          {step < 5 ? (
            <button onClick={() => setStep((s) => (s + 1) as typeof step)}
              disabled={(step === 1 && !canAdvance1) || (step === 2 && !canAdvance2) || (step === 3 && !requiredUploaded)}
              className="flex items-center gap-2 bg-uai-navy hover:bg-uai-navy-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm shadow-sm">
              Continuar <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={isSubmitting}
              className="flex items-center gap-2 bg-uai-gold hover:bg-uai-gold-hover disabled:opacity-50 text-uai-navy font-bold px-8 py-2.5 rounded-xl transition-colors text-sm shadow-sm">
              {isSubmitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                : <><Send className="w-4 h-4" /> Enviar al comité</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
