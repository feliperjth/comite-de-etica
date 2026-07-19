import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase";
import * as XLSX from "xlsx";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

const STATUS_LABELS: Record<string, string> = {
  submitted:   "Enviado",
  reviewing:   "En revisión",
  corrections: "Con observaciones",
  approved:    "Aprobado",
  rejected:    "Rechazado",
  certified:   "Certificado",
};

const TYPE_LABELS: Record<string, string> = {
  pregrado:  "Pregrado",
  magister:  "Magíster",
  doctorado: "Doctorado",
  docente:   "Docente/Investigador",
  fondecyt:  "Fondecyt",
  externo:   "Externo",
};

const FUNDING_LABELS: Record<string, string> = {
  fondecyt:  "Fondecyt",
  grant_uai: "Grant UAI",
  none:      "Sin financiamiento",
};

export async function GET() {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id,title,status,project_type,theme,advisor_name,funding_type,funding_folio,researcher_name,researcher_email,researcher_rut,reviewer,reviewer2,created_at,progress,certificate_url")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (projects ?? []).map((p, i) => ({
    "N°":                  i + 1,
    "Título":              p.title ?? "",
    "Estado":              STATUS_LABELS[p.status] ?? p.status,
    "Tipo":                TYPE_LABELS[p.project_type] ?? p.project_type,
    "Área temática":       p.theme ?? "",
    "Investigador/a":      p.researcher_name ?? "",
    "RUT investigador/a":  p.researcher_rut ?? "",
    "Correo investigador": p.researcher_email ?? "",
    "Profesor/a guía":     p.advisor_name ?? "",
    "Financiamiento":      FUNDING_LABELS[p.funding_type ?? "none"] ?? "",
    "Folio financiamiento":p.funding_folio ?? "",
    "Revisor 1":           p.reviewer ?? "",
    "Revisor 2":           p.reviewer2 ?? "",
    "Avance (%)":          p.progress ?? 0,
    "Certificado":         p.certificate_url ? "Sí" : "No",
    "Fecha de envío":      p.created_at ? new Date(p.created_at).toLocaleDateString("es-CL") : "",
    "Año":                 p.created_at ? new Date(p.created_at).getFullYear() : "",
    "Mes":                 p.created_at ? new Date(p.created_at).toLocaleDateString("es-CL", { month: "long" }) : "",
  }));

  // ── Sheet 1: Proyectos ────────────────────────────────────────────────────
  const wsProjects = XLSX.utils.json_to_sheet(rows);

  // Column widths
  wsProjects["!cols"] = [
    { wch: 5 }, { wch: 48 }, { wch: 18 }, { wch: 22 }, { wch: 28 },
    { wch: 28 }, { wch: 16 }, { wch: 32 }, { wch: 28 }, { wch: 18 },
    { wch: 18 }, { wch: 28 }, { wch: 28 }, { wch: 12 }, { wch: 12 },
    { wch: 14 }, { wch: 8  }, { wch: 14 },
  ];

  // ── Sheet 2: Resumen por estado ───────────────────────────────────────────
  const statusMap: Record<string, number> = {};
  (projects ?? []).forEach(p => { statusMap[p.status] = (statusMap[p.status] ?? 0) + 1; });
  const wsStatus = XLSX.utils.json_to_sheet(
    Object.entries(STATUS_LABELS).map(([key, label]) => ({
      "Estado":    label,
      "Cantidad":  statusMap[key] ?? 0,
      "Porcentaje": rows.length > 0 ? `${Math.round(((statusMap[key] ?? 0) / rows.length) * 100)}%` : "0%",
    }))
  );
  wsStatus["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 14 }];

  // ── Sheet 3: Resumen por tipo ─────────────────────────────────────────────
  const typeMap: Record<string, number> = {};
  (projects ?? []).forEach(p => { typeMap[p.project_type] = (typeMap[p.project_type] ?? 0) + 1; });
  const wsType = XLSX.utils.json_to_sheet(
    Object.entries(TYPE_LABELS)
      .map(([key, label]) => ({
        "Tipo":      label,
        "Cantidad":  typeMap[key] ?? 0,
        "Porcentaje": rows.length > 0 ? `${Math.round(((typeMap[key] ?? 0) / rows.length) * 100)}%` : "0%",
      }))
      .filter(r => r["Cantidad"] > 0)
  );
  wsType["!cols"] = [{ wch: 24 }, { wch: 12 }, { wch: 14 }];

  // ── Sheet 4: Resumen por temática ─────────────────────────────────────────
  const themeMap: Record<string, number> = {};
  (projects ?? []).forEach(p => { if (p.theme) themeMap[p.theme] = (themeMap[p.theme] ?? 0) + 1; });
  const wsTheme = XLSX.utils.json_to_sheet(
    Object.entries(themeMap)
      .sort((a, b) => b[1] - a[1])
      .map(([theme, count]) => ({
        "Área temática": theme,
        "Cantidad":      count,
        "Porcentaje":    rows.length > 0 ? `${Math.round((count / rows.length) * 100)}%` : "0%",
      }))
  );
  wsTheme["!cols"] = [{ wch: 38 }, { wch: 12 }, { wch: 14 }];

  // ── Sheet 5: Evolución mensual ────────────────────────────────────────────
  const monthMap: Record<string, number> = {};
  (projects ?? []).forEach(p => {
    if (!p.created_at) return;
    const d = new Date(p.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap[key] = (monthMap[key] ?? 0) + 1;
  });
  const wsMonthly = XLSX.utils.json_to_sheet(
    Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => ({
        "Período":   key,
        "Mes":       new Date(key + "-01").toLocaleDateString("es-CL", { month: "long", year: "numeric" }),
        "Proyectos": count,
      }))
  );
  wsMonthly["!cols"] = [{ wch: 12 }, { wch: 22 }, { wch: 12 }];

  // ── Workbook ──────────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsProjects, "Proyectos");
  XLSX.utils.book_append_sheet(wb, wsStatus,   "Por estado");
  XLSX.utils.book_append_sheet(wb, wsType,     "Por tipo");
  XLSX.utils.book_append_sheet(wb, wsTheme,    "Por temática");
  XLSX.utils.book_append_sheet(wb, wsMonthly,  "Evolución mensual");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const today = new Date().toLocaleDateString("es-CL").replace(/\//g, "-");
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="comite-etica-proyectos-${today}.xlsx"`,
    },
  });
}
