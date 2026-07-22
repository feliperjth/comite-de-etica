import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { sendEmail, buildResubmitNotificationEmail } from "@/lib/email";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { round } = await req.json();
    const supabase = getSupabaseServer();

    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

    const nextRound = (round ?? project.current_round ?? 1) + 1;

    // Update project to new round, back to reviewing
    await supabase
      .from("projects")
      .update({ status: "reviewing", progress: 60, current_round: nextRound })
      .eq("id", id);

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
        `Correcciones incorporadas · ${project.title}`,
        buildResubmitNotificationEmail(project, name),
      ).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("Resubmit error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
