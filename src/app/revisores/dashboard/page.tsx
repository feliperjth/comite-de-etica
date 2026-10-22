"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabase, type Project, type ProjectStatus } from "@/lib/supabase";
import { getThemeLabel } from "@/lib/themes";
import { safeStorageName } from "@/lib/storage";
import ProjectState from "@/components/ProjectState";
import ProjectDocumentsPanel from "@/components/ProjectDocumentsPanel";
import {
  LogOut, RefreshCw, ClipboardList, Clock, CheckCircle,
  AlertCircle, XCircle, Save, ChevronDown, FileSearch, Users, User, BookOpen,
  Trash2, AlertTriangle, X, Settings, Mail, Award, Gavel, Upload, Send,
} from "lucide-react";
import type { Reviewer } from "@/lib/supabase";
import FastTrackBadge from "@/components/FastTrackBadge";
import AssignmentPanel from "@/components/AssignmentPanel";
import PlazoBadge from "@/components/PlazoBadge";
import type { Plazo } from "@/lib/deadlines";

/** Debe coincidir con COORDINATION_NAME en /api/projects/[id]/close-stage. */
const COORDINATION_NAME = "Coordinación del Comité";

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: "submitted",   label: "Enviado" },
  { value: "reviewing",   label: "En revisión" },
  { value: "corrections", label: "Con observaciones" },
  { value: "approved",    label: "Aprobado" },
  { value: "certified",   label: "Certificado" },
  { value: "rejected",    label: "Rechazado" },
];

const progressByStatus: Record<ProjectStatus, number> = {
  submitted:   10,
  reviewing:   50,
  corrections: 40,
  approved:    100,
  certified:   100,
  rejected:    100,
};

type EditState = {
  status: ProjectStatus;
  reviewer: string;
  reviewer2: string;
  saving: boolean;
};

/** Cierre de etapa por la coordinación (ver /api/projects/[id]/close-stage). */
type CloseStageState = {
  project: Project;
  decision: "corrections" | "approved" | "rejected";
  comment: string;
  file: File | null;
  loading: boolean;
  error: string;
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith(name + "="))
      ?.split("=")[1] ?? ""
  );
}

const avatarColors = [
  "bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700", "bg-emerald-100 text-emerald-700",
  "bg-pink-100 text-pink-700", "bg-orange-100 text-orange-700",
];

export default function ReviewerDashboard() {
  const [projects, setProjects]   = useState<Project[]>([]);
  const [loading, setLoading]     = useState(true);
  const [edits, setEdits]         = useState<Record<string, EditState>>({});
  const [savedId, setSavedId]     = useState<string | null>(null);
  const [reviewerName, setReviewerName] = useState("");
  const [isAdmin, setIsAdmin]           = useState(false);
  const [myReviews, setMyReviews] = useState<{ project_id: string; round: number; overall_decision?: string }[]>([]);
  const [reviewers, setReviewers]   = useState<Reviewer[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"all"|"mine">("all");
  const [notifying, setNotifying] = useState<Record<string, { loading: boolean; msg: string }>>({});
  const [notifyingMissing, setNotifyingMissing] = useState<Record<string, { loading: boolean; msg: string }>>({});
  const [resendingCert, setResendingCert] = useState<Record<string, { loading: boolean; msg: string }>>({});
  const [missingDocProjects, setMissingDocProjects] = useState<Set<string>>(new Set());
  const [closeStage, setCloseStage] = useState<CloseStageState | null>(null);
  /** Proyectos con una consulta de estado del investigador sin responder. */
  const [consultas, setConsultas] = useState<Set<string>>(new Set());
  /** Plazo de la ronda actual por proyecto (solo los que están en revisión). */
  const [plazos, setPlazos] = useState<Record<string, Plazo>>({});
  const router = useRouter();

  const loadProjects = useCallback(async () => {
    setLoading(true);
    // Todo por endpoints: la identidad sale de la sesión firmada y las tablas
    // `projects`, `documents` y `reviews` dejan de leerse desde el navegador.
    const [listado, misRevisiones, abiertas] = await Promise.all([
      fetch("/api/comite/projects")
        .then(r => r.ok ? r.json() : { projects: [], missingDocs: [] })
        .catch(() => ({ projects: [], missingDocs: [] })),
      fetch("/api/reviews")
        .then(r => r.ok ? r.json() : { reviews: [] })
        .catch(() => ({ reviews: [] })),
      fetch("/api/status-requests")
        .then(r => r.ok ? r.json() : { open: [] })
        .catch(() => ({ open: [] })),
    ]);
    setConsultas(new Set<string>((abiertas.open ?? []).map((o: { project_id: string }) => o.project_id)));

    // Vía rápida activa primero, por fecha límite; el resto en su orden.
    const activa = (p: Project) => !!p.fast_track && ["submitted", "reviewing", "corrections"].includes(p.status);
    const list: Project[] = [...(listado.projects ?? [])].sort((x: Project, y: Project) => {
      if (activa(x) !== activa(y)) return activa(x) ? -1 : 1;
      if (activa(x) && activa(y)) return (x.fast_track_deadline ?? "").localeCompare(y.fast_track_deadline ?? "");
      return 0;
    });
    setProjects(list);
    setMyReviews(misRevisiones.reviews ?? []);
    setMissingDocProjects(new Set<string>(listado.missingDocs ?? []));
    setPlazos(listado.plazos ?? {});

    const initial: Record<string, EditState> = {};
    list.forEach((p) => {
      initial[p.id] = { status: p.status, reviewer: p.reviewer ?? "", reviewer2: p.reviewer2 ?? "", saving: false };
    });
    setEdits(initial);
    setLoading(false);
  }, []);

  const ADMIN_EMAIL = "felipe.rojast@uai.cl";

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(me => {
      const reviewerEmail = decodeURIComponent(getCookie("reviewer_email"));
      const reviewerName  = decodeURIComponent(getCookie("reviewer_name"));

      // Accept either reviewer session or coordinator/admin session
      const email = reviewerEmail || (me.email ?? "");
      const name  = reviewerName  || (me.name  ?? "");

      if (!email && !name) { router.push("/revisores"); return; }

      const admin = me.type === "admin" || email.toLowerCase() === ADMIN_EMAIL;
      setReviewerName(name);
      setIsAdmin(admin);
      loadProjects();
      if (admin) {
        fetch("/api/reviewers").then((r) => r.json()).then(setReviewers);
      }
    });
  }, [loadProjects, router]);

  function isAssigned(p: Project): boolean {
    const name = reviewerName.toLowerCase().trim();
    return (
      (p.reviewer?.toLowerCase().trim() === name && name !== "") ||
      (p.reviewer2?.toLowerCase().trim() === name && name !== "")
    );
  }

  function hasReviewed(p: Project): boolean {
    return myReviews.some(
      (r) => r.project_id === p.id && r.round === (p.current_round ?? 1)
    );
  }

  /** Ronda en la que aprobé el proyecto: mi aprobación vale para las siguientes. */
  function approvedRound(p: Project): number | null {
    const rounds = myReviews
      .filter((r) => r.project_id === p.id && r.overall_decision === "accepted")
      .map((r) => r.round);
    return rounds.length ? Math.min(...rounds) : null;
  }

  async function saveProject(id: string) {
    const edit = edits[id];
    if (!edit) return;
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], saving: true } }));

    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status:    edit.status,
        reviewer:  edit.reviewer  || null,
        reviewer2: edit.reviewer2 || null,
        progress:  progressByStatus[edit.status],
      }),
    });

    setSavedId(id);
    setTimeout(() => setSavedId(null), 2000);
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], saving: false } }));
    loadProjects();
  }

  async function handleNotifyReviewers(id: string) {
    setNotifying((prev) => ({ ...prev, [id]: { loading: true, msg: "" } }));
    try {
      const res  = await fetch(`/api/projects/${id}/notify-reviewer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      const msg  = res.ok
        ? (data.notified?.length
            ? `Aviso enviado a ${data.notified.join(", ")}`
            : "Sin revisores con correo registrado")
        : `Error: ${data.error}`;
      setNotifying((prev) => ({ ...prev, [id]: { loading: false, msg } }));
    } catch {
      setNotifying((prev) => ({ ...prev, [id]: { loading: false, msg: "Error al enviar" } }));
    }
    setTimeout(() => setNotifying((prev) => ({ ...prev, [id]: { loading: false, msg: "" } })), 5000);
  }

  async function handleNotifyMissing(id: string) {
    setNotifyingMissing((prev) => ({ ...prev, [id]: { loading: true, msg: "" } }));
    try {
      const res  = await fetch(`/api/projects/${id}/notify-missing-docs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      const msg  = res.ok
        ? (data.sent ? `Aviso enviado a ${data.to}` : "Este proyecto ya no tiene documentos faltantes")
        : `Error: ${data.error}`;
      setNotifyingMissing((prev) => ({ ...prev, [id]: { loading: false, msg } }));
    } catch {
      setNotifyingMissing((prev) => ({ ...prev, [id]: { loading: false, msg: "Error al enviar" } }));
    }
    setTimeout(() => setNotifyingMissing((prev) => ({ ...prev, [id]: { loading: false, msg: "" } })), 5000);
  }

  // Reenvía a Macarena el correo de solicitud de certificado de ética (proyectos
  // aprobados/certificados). Útil si el envío automático falló o se perdió.
  async function handleResendCert(id: string) {
    setResendingCert((prev) => ({ ...prev, [id]: { loading: true, msg: "" } }));
    try {
      const res  = await fetch(`/api/projects/${id}/request-cert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      const msg  = res.ok ? "Correo enviado a Macarena" : `Error: ${data.error}`;
      setResendingCert((prev) => ({ ...prev, [id]: { loading: false, msg } }));
    } catch {
      setResendingCert((prev) => ({ ...prev, [id]: { loading: false, msg: "Error al enviar" } }));
    }
    setTimeout(() => setResendingCert((prev) => ({ ...prev, [id]: { loading: false, msg: "" } })), 5000);
  }

  async function handleDeleteProject(id: string) {
    setDeletingId(id);
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setConfirmDelete(null);
    setDeletingId(null);
  }

  function openCloseStage(project: Project) {
    setCloseStage({
      project,
      decision: "corrections",
      comment: "",
      file: null,
      loading: false,
      error: "",
    });
  }

  async function handleCloseStage() {
    if (!closeStage) return;
    const { project, decision, comment, file } = closeStage;
    setCloseStage((prev) => prev && { ...prev, loading: true, error: "" });

    // El documento va al mismo sitio que el de los revisores, con el prefijo de
    // coordinación en el nombre para que se atribuya bien en correo y /track.
    if (file) {
      const supabase = getSupabase();
      const round = project.current_round ?? 1;
      const path = `${project.id}/review-feedback/r${round}/${Date.now()}_${safeStorageName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file, { upsert: true });
      if (uploadError) {
        setCloseStage((prev) => prev && { ...prev, loading: false, error: `No se pudo subir el documento: ${uploadError.message}` });
        return;
      }
      // Registro por el servidor: `documents` ya no es escribible desde el
      // navegador. La sesion de revisor autoriza la operacion.
      const resDoc = await fetch(`/api/projects/${project.id}/documents`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_type:  "review_feedback",
          file_name: `${COORDINATION_NAME} - ${file.name}`,
          file_path: path,
        }),
      });
      const docError = resDoc.ok ? null : { message: (await resDoc.json().catch(() => ({}))).error ?? "Error al registrar" };
      if (docError) {
        setCloseStage((prev) => prev && { ...prev, loading: false, error: `No se pudo registrar el documento: ${docError.message}` });
        return;
      }
    }

    const res = await fetch(`/api/projects/${project.id}/close-stage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, comment, origin: window.location.origin }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setCloseStage((prev) => prev && { ...prev, loading: false, error: data.error ?? "No se pudo cerrar la etapa." });
      return;
    }

    setCloseStage(null);
    await loadProjects();
  }

  async function handleLogout() {
    await fetch("/api/auth",        { method: "DELETE" });
    await fetch("/api/comite/auth", { method: "DELETE" });
    router.push("/revisores");
    router.refresh();
  }

  // Non-admins always see only their assigned projects; admin can toggle
  const visibleProjects = !isAdmin
    ? projects.filter(isAssigned)
    : viewMode === "mine"
      ? projects.filter(isAssigned)
      : projects;

  const stats = isAdmin ? [
    { label: "Total",       value: projects.length,                                                       icon: ClipboardList, color: "text-[#1A1A1A]", bg: "bg-slate-100" },
    { label: "Pendientes",  value: projects.filter((p) => p.status === "submitted").length,               icon: Clock,         color: "text-amber-600",  bg: "bg-amber-50"  },
    { label: "En revisión", value: projects.filter((p) => p.status === "reviewing").length,               icon: AlertCircle,   color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Aprobados",   value: projects.filter((p) => p.status === "approved" || p.status === "certified").length, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Rechazados",  value: projects.filter((p) => p.status === "rejected").length,                icon: XCircle,       color: "text-red-500",    bg: "bg-red-50"    },
  ] : [
    { label: "Asignados",   value: visibleProjects.length,                                                icon: ClipboardList, color: "text-[#1A1A1A]", bg: "bg-slate-100" },
    { label: "Pendientes",  value: visibleProjects.filter((p) => p.status === "submitted" || p.status === "reviewing").length, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Revisados",   value: visibleProjects.filter((p) => hasReviewed(p)).length,                  icon: CheckCircle,   color: "text-emerald-600",bg: "bg-emerald-50"},
  ];

  return (
    <>
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-uai-navy">Panel de Revisores</h1>
            <span className="bg-orange-100 text-[#CC5200] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              Modo Comité
            </span>
          </div>
          {reviewerName && (
            <p className="text-slate-500 text-sm">Sesión: <strong className="text-[#1A1A1A]">{reviewerName}</strong></p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadProjects}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
          <button
            onClick={() => router.push("/revisores/pauta")}
            className="flex items-center gap-2 text-slate-500 hover:text-[#CC5200] border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors hover:border-orange-200 hover:bg-orange-50"
          >
            <BookOpen className="w-4 h-4" /> Ver pauta
          </button>
          <button
            onClick={() => router.push(isAdmin ? "/comite/perfil" : "/revisores/perfil")}
            className="flex items-center gap-2 text-slate-500 hover:text-[#CC5200] border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors hover:border-orange-200 hover:bg-orange-50"
          >
            <BookOpen className="w-4 h-4" /> Mi perfil
          </button>
          {isAdmin && (
            <button
              onClick={() => router.push("/comite/migrar")}
              className="flex items-center gap-2 text-slate-500 hover:text-violet-600 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors hover:border-violet-200 hover:bg-violet-50"
            >
              <Settings className="w-4 h-4" /> BD Migrar
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-500 hover:text-red-600 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors hover:border-red-200 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-slate-400 text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Asignación de revisores (solo admin) */}
      {isAdmin && (
        <AssignmentPanel projects={projects} reviewers={reviewers} onChanged={loadProjects} />
      )}

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          {isAdmin ? (
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode("all")}
                className={`flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                  viewMode === "all" ? "bg-white text-uai-navy shadow-sm" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Todos
              </button>
              <button
                onClick={() => setViewMode("mine")}
                className={`flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                  viewMode === "mine" ? "bg-white text-uai-navy shadow-sm" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <User className="w-3.5 h-3.5" /> Mis asignados
              </button>
            </div>
          ) : (
            <h2 className="font-semibold text-slate-700">Proyectos asignados a mí</h2>
          )}
          <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full shrink-0">
            {visibleProjects.length} proyecto{visibleProjects.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-slate-300" />
            Cargando proyectos...
          </div>
        ) : visibleProjects.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 text-slate-200" />
            <p>{isAdmin ? "No hay proyectos enviados aún." : "No tienes proyectos asignados."}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {visibleProjects.map((p, i) => {
              const edit = edits[p.id] ?? { status: p.status, reviewer: p.reviewer ?? "", reviewer2: p.reviewer2 ?? "", saving: false };
              const changed =
                edit.status    !== p.status           ||
                edit.reviewer  !== (p.reviewer  ?? "") ||
                edit.reviewer2 !== (p.reviewer2 ?? "");
              const isSaved    = savedId === p.id;
              const assigned   = isAssigned(p);
              const reviewed   = hasReviewed(p);

              return (
                <div key={p.id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors">

                  {/* ── Fila 1: info del proyecto (ancho completo) ── */}
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${avatarColors[i % avatarColors.length]}`}>
                      {getInitials(p.researcher_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-sm leading-snug">{p.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {p.researcher_name} · {p.project_type} · {getThemeLabel(p.theme)}
                      </p>
                      {/* Estado: etapas siempre en el mismo orden */}
                      <div className="mt-2">
                        <ProjectState status={p.status} certificateUrl={p.certificate_url} round={p.current_round} />
                      </div>
                      {/* Avisos, en orden fijo: tu parte → plazo → consulta → co-revisor */}
                      <div className="flex items-center gap-2 flex-wrap mt-1.5 empty:hidden">
                        {assigned && (() => {
                          const ronda    = p.current_round ?? 1;
                          const aprobada = approvedRound(p);
                          if (aprobada !== null) {
                            return (
                              <span className="text-xs bg-emerald-50 text-emerald-600 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-100">
                                ✓ Aprobaste en ronda {aprobada}
                              </span>
                            );
                          }
                          if (reviewed) {
                            return (
                              <span className="text-xs bg-emerald-50 text-emerald-600 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-100">
                                ✓ Revisaste la ronda {ronda}
                              </span>
                            );
                          }
                          if (p.status === "corrections") {
                            return (
                              <span className="text-xs bg-slate-100 text-slate-500 font-medium px-2.5 py-0.5 rounded-full">
                                Esperando correcciones del investigador
                              </span>
                            );
                          }
                          if (["submitted", "reviewing"].includes(p.status)) {
                            return (
                              <button
                                onClick={() => router.push(`/revisores/review/${p.id}`)}
                                className="flex items-center gap-1.5 text-xs bg-[#CC5200] hover:bg-[#B34700] text-white font-bold px-3 py-1 rounded-full transition-colors"
                              >
                                <FileSearch className="w-3 h-3" />
                                Revisar ronda {ronda}
                              </button>
                            );
                          }
                          return null;
                        })()}
                        {["submitted", "reviewing", "corrections"].includes(p.status) && <FastTrackBadge project={p} />}
                        {plazos[p.id] && !plazos[p.id].viaRapida && <PlazoBadge plazo={plazos[p.id]} />}
                        {(assigned || isAdmin) && consultas.has(p.id) && ["submitted", "reviewing"].includes(p.status) && (
                          <button
                            onClick={() => router.push(`/revisores/review/${p.id}`)}
                            className="flex items-center gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white font-bold px-3 py-1 rounded-full transition-colors"
                            title="El investigador/a preguntó cómo va la revisión"
                          >
                            <Mail className="w-3 h-3" /> Consulta de estado
                          </button>
                        )}
                        {/* Co-reviewer badge (visible to reviewer, not admin) */}
                        {!isAdmin && assigned && (() => {
                          const co = p.reviewer === reviewerName ? p.reviewer2 : p.reviewer2 === reviewerName ? p.reviewer : null;
                          return co ? (
                            <span className="text-xs bg-slate-100 text-slate-500 font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <Users className="w-3 h-3" /> Co-revisor/a: {co}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* ── Fila 2: controles de edición (solo admin) ── */}
                  {isAdmin && (() => {
                    return (
                      <div className="ml-12 mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                        {/* Estado */}
                        <div className="relative">
                          <select
                            value={edit.status}
                            onChange={(e) => setEdits((prev) => ({ ...prev, [p.id]: { ...prev[p.id], status: e.target.value as ProjectStatus } }))}
                            className="appearance-none w-36 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 pr-7 cursor-pointer"
                          >
                            {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        {/* Revisores */}
                        <select
                          value={edit.reviewer}
                          onChange={(e) => setEdits((prev) => ({ ...prev, [p.id]: { ...prev[p.id], reviewer: e.target.value } }))}
                          className="w-40 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                        >
                          <option value="">— Revisor 1 —</option>
                          {reviewers.map((r) => (
                            <option key={r.email} value={r.name}>{r.name}</option>
                          ))}
                        </select>
                        <select
                          value={edit.reviewer2}
                          onChange={(e) => setEdits((prev) => ({ ...prev, [p.id]: { ...prev[p.id], reviewer2: e.target.value } }))}
                          className="w-40 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                        >
                          <option value="">— Revisor 2 —</option>
                          {reviewers.map((r) => (
                            <option key={r.email} value={r.name}>{r.name}</option>
                          ))}
                        </select>
                        {/* Avisar / Guardar / Eliminar — empujados a la derecha */}
                        <div className="ml-auto flex items-center gap-2">
                          {missingDocProjects.has(p.id) && (
                            <>
                              {notifyingMissing[p.id]?.msg && (
                                <span className={`text-xs font-medium ${notifyingMissing[p.id].msg.startsWith("Error") ? "text-red-500" : "text-emerald-600"}`}>
                                  {notifyingMissing[p.id].msg}
                                </span>
                              )}
                              <button
                                onClick={() => handleNotifyMissing(p.id)}
                                disabled={notifyingMissing[p.id]?.loading}
                                title="Avisar al investigador por correo que faltan documentos por subir"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100 disabled:opacity-50 transition-all"
                              >
                                {notifyingMissing[p.id]?.loading
                                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Enviando...</>
                                  : <><AlertTriangle className="w-3.5 h-3.5" /> Avisar docs faltantes</>}
                              </button>
                            </>
                          )}
                          {(p.reviewer || p.reviewer2) && (
                            <>
                              {notifying[p.id]?.msg && (
                                <span className={`text-xs font-medium ${notifying[p.id].msg.startsWith("Error") ? "text-red-500" : "text-emerald-600"}`}>
                                  {notifying[p.id].msg}
                                </span>
                              )}
                              <button
                                onClick={() => handleNotifyReviewers(p.id)}
                                disabled={notifying[p.id]?.loading}
                                title="Enviar correo a los revisores asignados avisando del proyecto"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-[#CC5200] border border-[#CC5200]/40 hover:bg-orange-50 disabled:opacity-50 transition-all"
                              >
                                {notifying[p.id]?.loading
                                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Enviando...</>
                                  : <><Mail className="w-3.5 h-3.5" /> Avisar</>}
                              </button>
                            </>
                          )}
                          {(p.status === "approved" || p.status === "certified") && (
                            <>
                              {resendingCert[p.id]?.msg && (
                                <span className={`text-xs font-medium ${resendingCert[p.id].msg.startsWith("Error") ? "text-red-500" : "text-emerald-600"}`}>
                                  {resendingCert[p.id].msg}
                                </span>
                              )}
                              <button
                                onClick={() => handleResendCert(p.id)}
                                disabled={resendingCert[p.id]?.loading}
                                title="Reenviar a Macarena el correo de solicitud de certificado de ética (con consentimiento/asentimiento adjuntos)"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-300 hover:bg-violet-100 disabled:opacity-50 transition-all"
                              >
                                {resendingCert[p.id]?.loading
                                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Enviando...</>
                                  : <><Award className="w-3.5 h-3.5" /> Reenviar a Macarena</>}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => saveProject(p.id)}
                            disabled={(!changed && !isSaved) || edit.saving}
                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              isSaved ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : changed ? "bg-uai-navy text-white hover:bg-uai-navy-dark shadow-sm"
                              : "bg-slate-100 text-slate-400 cursor-not-allowed"
                            }`}
                          >
                            {isSaved ? <><CheckCircle className="w-3.5 h-3.5" /> Guardado</>
                             : edit.saving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Guardando...</>
                             : <><Save className="w-3.5 h-3.5" /> Guardar</>}
                          </button>
                          {["submitted", "reviewing", "corrections"].includes(p.status) && (
                            <button
                              onClick={() => openCloseStage(p)}
                              title="Cerrar esta etapa en nombre de los revisores: enviar el documento y las observaciones al investigador, o resolver el proyecto. Los revisores asignados siguen a cargo."
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1A1A1A] text-white hover:bg-black transition-all"
                            >
                              <Gavel className="w-3.5 h-3.5" /> Cerrar etapa
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmDelete(p)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all"
                            title="Eliminar proyecto"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Documentos del expediente. La coordinación puede gestionar
                      todos; un revisor, solo los que subió él. */}
                  <div className="mt-3">
                    {/* Desplegado: el revisor entra aquí a leer y reemplazar
                        archivos, y tenerlos plegados obligaba a un clic extra
                        por proyecto. */}
                    <ProjectDocumentsPanel projectId={p.id} manage scopeAll />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>

    {/* ── Modal cerrar etapa (coordinación) ── */}
    {closeStage && (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 max-w-lg w-full my-auto">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Gavel className="w-7 h-7 text-[#1A1A1A]" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 text-center mb-2">Cerrar etapa</h2>
          <p className="text-slate-500 text-sm text-center mb-1 leading-snug">{closeStage.project.title}</p>
          <p className="text-xs text-slate-400 text-center mb-5">
            Ronda {closeStage.project.current_round ?? 1} · Cierras en nombre del comité.
            {(closeStage.project.reviewer || closeStage.project.reviewer2) && " Los revisores asignados siguen a cargo del proyecto."}
          </p>

          {/* Decisión */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {([
              { value: "corrections", label: "Observaciones", cls: "bg-orange-500 border-orange-500" },
              { value: "approved",    label: "Aprobar",       cls: "bg-emerald-500 border-emerald-500" },
              { value: "rejected",    label: "Rechazar",      cls: "bg-red-500 border-red-500" },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setCloseStage((prev) => prev && { ...prev, decision: opt.value })}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  closeStage.decision === opt.value
                    ? `${opt.cls} text-white`
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Comentario */}
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            {closeStage.decision === "corrections" ? "Observaciones para el investigador" : "Comentario (opcional)"}
          </label>
          <textarea
            value={closeStage.comment}
            onChange={(e) => setCloseStage((prev) => prev && { ...prev, comment: e.target.value })}
            rows={5}
            placeholder={closeStage.decision === "corrections"
              ? "Resume aquí lo que el investigador debe corregir…"
              : "Se incluirá en el correo al investigador."}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none mb-4"
          />

          {/* Documento */}
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Documento de los revisores (opcional)
          </label>
          <label className="flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors mb-1">
            <Upload className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-sm text-slate-500 truncate">
              {closeStage.file ? closeStage.file.name : "Adjuntar el documento comentado"}
            </span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => setCloseStage((prev) => prev && { ...prev, file: e.target.files?.[0] ?? null })}
            />
          </label>
          <p className="text-[11px] text-slate-400 mb-5">
            Se enviará adjunto al investigador y quedará visible en su seguimiento.
          </p>

          {closeStage.error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{closeStage.error}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setCloseStage(null)}
              disabled={closeStage.loading}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" /> Cancelar
            </button>
            <button
              onClick={handleCloseStage}
              disabled={closeStage.loading}
              className="flex-1 py-3 rounded-xl bg-[#1A1A1A] hover:bg-black text-white font-bold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {closeStage.loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {closeStage.loading ? "Enviando..." : "Enviar al investigador"}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Modal confirmación eliminar ── */}
    {confirmDelete && (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 max-w-md w-full">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 text-center mb-2">¿Eliminar proyecto?</h2>
          <p className="text-slate-500 text-sm text-center mb-3">Esta acción es <strong>irreversible</strong>.</p>
          <div className="bg-slate-50 rounded-xl px-4 py-3 my-4 text-sm text-slate-700 text-center leading-snug">
            <strong>{confirmDelete.title}</strong><br />
            <span className="text-slate-400 text-xs">{confirmDelete.researcher_name}</span>
          </div>
          <p className="text-xs text-slate-400 text-center mb-6">Se eliminarán también todas las revisiones y documentos asociados.</p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmDelete(null)}
              disabled={!!deletingId}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" /> Cancelar
            </button>
            <button
              onClick={() => handleDeleteProject(confirmDelete.id)}
              disabled={!!deletingId}
              className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {deletingId ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {deletingId ? "Eliminando..." : "Sí, eliminar"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
