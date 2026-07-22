import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseServer } from "@/lib/supabase";
import {
  sendEmail,
  buildRejectedEmail,
  buildReviewerAssignedEmail,
  buildApprovalEmail,
  buildCertRequestEmail,
  buildCoordinatorApprovalEmail,
  ETHICS_COMMITTEE_EMAIL,
} from "@/lib/email";
import { generateCertToken } from "@/app/api/certify/route";
import { canAccessProject, getSession, requireAdmin, requireStaff } from "@/lib/auth";

/**
 * Un proyecto concreto. Lo consumen las pantallas de revisión, que antes lo
 * leían de la tabla con la clave anónima — lo que obligaba a dejar `projects`
 * legible por cualquiera.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseServer();

  const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  // Un investigador solo puede ver los suyos; el personal del comité, todos.
  if (!canAccessProject(session, data)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  return NextResponse.json({ project: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Cambia estados y dispara correos (aprobación, solicitud de certificado).
  const { response } = await requireStaff(request);
  if (response) return response;

  const { id } = await params;
  const body   = await request.json();
  const supabase = getSupabaseServer();

  // Snapshot before update so we can detect changes
  const { data: prev } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  const { data, error } = await supabase
    .from("projects")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Derive origin from the request
  const origin =
    request.headers.get("origin") ??
    (() => {
      const ref = request.headers.get("referer") ?? "";
      const m   = ref.match(/^(https?:\/\/[^/]+)/);
      return m ? m[1] : "";
    })();

  // ── Trigger: proyecto aprobado ───────────────────────────────────
  if (prev && body.status === "approved" && prev.status !== "approved" && prev.researcher_email) {
    sendEmail(
      prev.researcher_email,
      `¡Tu proyecto fue aprobado! · ${prev.title}`,
      buildApprovalEmail(prev, origin),
    ).catch(() => {});

    const coordinatorEmail = process.env.COORDINATOR_EMAIL;
    if (coordinatorEmail) {
      sendEmail(
        coordinatorEmail,
        `Proyecto aprobado · ${prev.title}`,
        buildCoordinatorApprovalEmail(prev),
      ).catch(() => {});
    }

    const macarenaEmail = process.env.MACARENA_EMAIL;
    if (macarenaEmail) {
      const certToken = generateCertToken(prev.id);
      buildCertRequestEmail(supabase, prev, origin, certToken)
        .then(({ html, attachments }) =>
          sendEmail(
            macarenaEmail,
            `Solicitud certificado de ética · ${prev.title}`,
            html,
            [prev.researcher_email, ETHICS_COMMITTEE_EMAIL],
            attachments,
          ),
        )
        .catch(() => {});
    }
  }

  // ── Trigger: proyecto rechazado ──────────────────────────────────
  if (prev && body.status === "rejected" && prev.status !== "rejected" && prev.researcher_email) {
    sendEmail(
      prev.researcher_email,
      `Resultado de evaluación ética · ${prev.title}`,
      buildRejectedEmail(prev, origin),
    ).catch(() => {});
  }

  // ── Trigger: asignación automática cuando status → reviewing ────
  if (
    prev && body.status === "reviewing" && prev.status !== "reviewing" &&
    !body.reviewer && !body.reviewer2 && !data.reviewer && !data.reviewer2
  ) {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: settings } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "reviewer_assignment_mode")
      .maybeSingle();

    if (settings?.value === "auto") {
      const { data: allReviewers } = await supabaseAdmin
        .from("reviewers").select("id, name, email, expertise");
      const { data: activeProjects } = await supabaseAdmin
        .from("projects").select("reviewer, reviewer2")
        .in("status", ["submitted", "reviewing", "corrections"]);

      const activeCount: Record<string, number> = {};
      for (const p of activeProjects ?? []) {
        if (p.reviewer)  activeCount[p.reviewer]  = (activeCount[p.reviewer]  ?? 0) + 1;
        if (p.reviewer2) activeCount[p.reviewer2] = (activeCount[p.reviewer2] ?? 0) + 1;
      }

      const eligible = (allReviewers ?? []).filter(
        (r) => r.expertise?.includes(data.theme) && (activeCount[r.name] ?? 0) < 5
      );
      const fallback = (allReviewers ?? []).filter(
        (r) => (activeCount[r.name] ?? 0) < 5 && !eligible.find((e) => e.email === r.email)
      );
      const pool = [...eligible, ...fallback].sort(() => Math.random() - 0.5);

      if (pool.length >= 2) {
        const [r1, r2] = pool;
        await supabaseAdmin.from("projects").update({
          reviewer: r1.name, reviewer2: r2.name,
        }).eq("id", id);

        for (const rv of [r1, r2]) {
          sendEmail(
            rv.email,
            `Proyecto asignado para revisión · ${data.title}`,
            buildReviewerAssignedEmail({ ...data, reviewer: r1.name, reviewer2: r2.name }, rv.name, origin),
          ).catch(() => {});
        }
      }
    }
  }

  // Nota: al asignar revisores manualmente NO se envía correo automático; el
  // coordinador avisa explícitamente con el botón "Avisar" del dashboard, que
  // llama a POST /api/projects/[id]/notify-reviewer. (La asignación automática
  // de arriba sí notifica, por ser un envío sin intervención del coordinador.)

  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Borra el proyecto con sus revisiones y documentos: solo coordinación.
  const { response } = await requireAdmin(req);
  if (response) return response;

  const { id } = await params;
  const supabase = getSupabaseServer();

  // Remove dependent records first
  await supabase.from("section_reviews").delete().in(
    "review_id",
    (await supabase.from("reviews").select("id").eq("project_id", id)).data?.map((r) => r.id) ?? []
  );
  await supabase.from("reviews").delete().eq("project_id", id);
  await supabase.from("group_draft_sections").delete().in(
    "draft_id",
    (await supabase.from("group_drafts").select("id").eq("project_id", id)).data?.map((d) => d.id) ?? []
  );
  await supabase.from("group_drafts").delete().eq("project_id", id);
  await supabase.from("project_documents").delete().eq("project_id", id);

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
