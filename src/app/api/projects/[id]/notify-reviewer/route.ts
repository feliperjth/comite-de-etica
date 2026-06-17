import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getSupabaseAdmin } from "@/lib/supabase";
import { sendEmail, buildReviewerAssignedEmail } from "@/lib/email";

/**
 * Avisa por correo a los revisores asignados de un proyecto que tienen una
 * revisión pendiente. Lo dispara el coordinador con el botón "Avisar" del
 * dashboard. Si se pasa `reviewerName` avisa solo a ese; si no, a todos los
 * revisores asignados (reviewer + reviewer2).
 *
 * El correo de cada revisor se resuelve desde la tabla `reviewers` (fuente
 * oficial — incluye a quienes aún no han enviado ninguna revisión), con
 * respaldo en `reviews` por compatibilidad con datos antiguos.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Debe estar autenticado en el comité/panel de revisores.
  const email = req.cookies.get("comite_email")?.value
             ?? req.cookies.get("reviewer_email")?.value;
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const onlyName: string | undefined = body?.reviewerName;

  const supabase = getSupabase();
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });

  const names = (onlyName ? [onlyName] : [project.reviewer, project.reviewer2])
    .filter(Boolean) as string[];
  if (!names.length) {
    return NextResponse.json({ error: "El proyecto no tiene revisores asignados." }, { status: 400 });
  }

  const origin =
    req.headers.get("origin") ??
    (req.headers.get("referer") ?? "").match(/^(https?:\/\/[^/]+)/)?.[1] ??
    "";

  const supabaseAdmin = getSupabaseAdmin();
  const notified: string[] = [];
  const skipped: string[] = [];

  for (const name of names) {
    let reviewerEmail: string | null = null;

    const { data: reg } = await supabaseAdmin
      .from("reviewers")
      .select("email")
      .ilike("name", name)
      .limit(1)
      .maybeSingle();
    reviewerEmail = reg?.email ?? null;

    if (!reviewerEmail) {
      const { data: rev } = await supabase
        .from("reviews")
        .select("reviewer_email")
        .ilike("reviewer_name", name)
        .limit(1)
        .maybeSingle();
      reviewerEmail = rev?.reviewer_email ?? null;
    }

    if (!reviewerEmail) { skipped.push(name); continue; }

    await sendEmail(
      reviewerEmail,
      `Proyecto asignado para revisión · ${project.title}`,
      buildReviewerAssignedEmail(project, name, origin),
    ).catch(() => {});
    notified.push(name);
  }

  return NextResponse.json({ ok: true, notified, skipped });
}
