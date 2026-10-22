import { Zap } from "lucide-react";
import { esUrgente, etiquetaViaRapida, fechaLimiteLegible } from "@/lib/fastTrack";

/** Etiqueta de vía rápida con los días que faltan para la fecha límite. */
export default function FastTrackBadge({
  project,
  dark = false,
}: {
  project: { fast_track?: boolean | null; fast_track_deadline?: string | null };
  dark?: boolean;
}) {
  const texto = etiquetaViaRapida(project);
  if (!texto) return null;
  const urgente = esUrgente(project);
  const cls = dark
    ? urgente ? "bg-red-500 text-white" : "bg-[#CC5200] text-white"
    : urgente ? "bg-red-50 text-red-600 border border-red-200" : "bg-orange-50 text-[#CC5200] border border-orange-200";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${cls}`}
      title={project.fast_track_deadline ? `Fecha límite de postulación: ${fechaLimiteLegible(project.fast_track_deadline)}` : undefined}
    >
      <Zap className="w-3 h-3" /> {texto}
    </span>
  );
}
