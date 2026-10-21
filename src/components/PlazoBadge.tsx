import { CalendarClock } from "lucide-react";
import { etiquetaPlazo, fechaLarga, type Plazo } from "@/lib/deadlines";

/** Plazo de revisión de la ronda: "Plazo: 12 nov · quedan 9 días". */
export default function PlazoBadge({ plazo, dark = false }: { plazo: Plazo | null | undefined; dark?: boolean }) {
  if (!plazo) return null;
  const cerca = !plazo.vencido && plazo.diasRestantes <= 5;
  const cls = plazo.vencido
    ? dark ? "bg-red-500 text-white" : "bg-red-50 text-red-600 border border-red-200"
    : cerca
    ? dark ? "bg-amber-400 text-[#1A1A1A]" : "bg-amber-50 text-amber-700 border border-amber-200"
    : dark ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600 border border-slate-200";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${cls}`}
      title={`Plazo de revisión de la ronda: ${fechaLarga(plazo.limite)}`}
    >
      <CalendarClock className="w-3 h-3" /> {etiquetaPlazo(plazo)}
    </span>
  );
}
