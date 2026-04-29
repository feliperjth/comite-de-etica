const config: Record<string, { label: string; classes: string; dot: string }> = {
  draft:       { label: "Borrador",          classes: "bg-slate-100 text-slate-600",    dot: "bg-slate-400" },
  submitted:   { label: "Enviado",           classes: "bg-blue-50 text-blue-700",       dot: "bg-blue-500" },
  reviewing:   { label: "En revisión",       classes: "bg-amber-50 text-amber-700",     dot: "bg-amber-500" },
  corrections: { label: "Con observaciones", classes: "bg-orange-50 text-orange-700",   dot: "bg-orange-500" },
  approved:    { label: "Aprobado",          classes: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  certified:   { label: "Certificado",       classes: "bg-violet-50 text-violet-700",   dot: "bg-violet-500" },
  rejected:    { label: "Rechazado",         classes: "bg-red-50 text-red-600",         dot: "bg-red-500" },
};

export default function StatusBadge({ status }: { status: string }) {
  const { label, classes, dot } = config[status] ?? config.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
