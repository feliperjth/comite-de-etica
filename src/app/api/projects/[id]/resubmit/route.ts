import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { canAccessProject, getSession } from "@/lib/auth";
import { sendEmail, buildResubmitNotificationEmail, buildDocumentoAnadidoEmail } from "@/lib/email";

/**
 * Cierra la ronda del investigador: pasa el proyecto a la siguiente y avisa a
 * los revisores de que hay correcciones que evaluar.
 *
 * Con `soloAviso` no mueve la ronda: es el investigador añadiendo un documento
 * que olvidó, a la ronda que YA está abierta. Sin esa distinción, cada anexo
 * empujaría el proyecto una ronda más y el expediente contaría rondas que
 * ningún revisor evaluó.
 *
 * Autoriza igual que el registro de documentos, porque es el segundo paso del
 * mismo reenvío: por sesión, o por el código de seguimiento cuando se llega a
 * /track desde el enlace del correo sin haber iniciado sesión. Antes no
 * comprobaba nada, así que cualquiera podía saltar la ronda de un proyecto
 * ajeno y disparar correos a sus revisores.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { round, code, soloAviso } = await req.json();
    const supabase = getSupabaseServer();

    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

    const session = await getSession(req);
    const porSesion = !!session && canAccessProject(session, project);
    const porCodigo =
      typeof code === "string" &&
      !!code.trim() &&
      project.tracking_code === code.trim().toUpperCase();

    if (!porSesion && !porCodigo) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const soloNotificar = soloAviso === true;
    const nextRound = (round ?? project.current_round ?? 1) + 1;

    // Update project to new round, back to reviewing
    if (!soloNotificar) {
      await supabase
        .from("projects")
        .update({ status: "reviewing", progress: 60, current_round: nextRound })
        .eq("id", id);
    }

    // Se avisa a los revisores ASIGNADOS al proyecto, no a quienes firmaron la
    // ronda anterior: si la coordinación cerró esa ronda en su nombre, no hay
    // ninguna revisión suya y se quedarían sin enterarse de que les toca.
    const assignedNames = [project.reviewer, project.reviewer2].filter(Boolean) as string[];

    const recipients = new Map<string, string>(); // email → nombre

    for (const name of assignedNames) {
      const { data: reviewer } = await supabase
        .from("reviewers")
        .select("name, email")
        .ilike("name", name)
        .limit(1)
        .maybeSingle();
      if (reviewer?.email) recipients.set(reviewer.email, reviewer.name ?? name);
    }

    // Además, quien haya revisado la ronda anterior sin figurar como asignado.
    const { data: reviews } = await supabase
      .from("reviews")
      .select("reviewer_name, reviewer_email, is_editorial")
      .eq("project_id", id)
      .eq("round", round ?? project.current_round ?? 1);

    for (const r of reviews ?? []) {
      // La coordinación no necesita el aviso: es quien gestiona el proceso.
      if (r.reviewer_email && !r.is_editorial && !recipients.has(r.reviewer_email)) {
        recipients.set(r.reviewer_email, r.reviewer_name);
      }
    }

    for (const [email, name] of recipients) {
      await sendEmail(
        email,
        soloNotificar
          ? `Documento añadido · ${project.title}`
          : `Correcciones incorporadas · ${project.title}`,
        soloNotificar
          ? buildDocumentoAnadidoEmail(project, name)
          : buildResubmitNotificationEmail(project, name),
      ).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("Resubmit error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
