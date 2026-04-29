import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { sendEmail, buildResubmitNotificationEmail } from "@/lib/email";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { round } = await req.json();
    const supabase = getSupabase();

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

    // Fetch previous reviewers' emails from reviews table
    const { data: reviews } = await supabase
      .from("reviews")
      .select("reviewer_name, reviewer_email")
      .eq("project_id", id)
      .eq("round", round ?? project.current_round ?? 1);

    // Notify each reviewer
    for (const r of reviews ?? []) {
      if (r.reviewer_email) {
        await sendEmail(
          r.reviewer_email,
          `Correcciones incorporadas · ${project.title}`,
          buildResubmitNotificationEmail(project, r.reviewer_name),
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("Resubmit error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
