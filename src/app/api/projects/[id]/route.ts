import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import {
  sendEmail,
  buildRejectedEmail,
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

  // Nota: al asignar revisores manualmente NO se envía correo automático; el
  // coordinador avisa explícitamente con el botón "Avisar" del dashboard, que
  // llama a POST /api/projects/[id]/notify-reviewer. La asignación automática
  // se confirma desde el panel (POST /api/admin/assignments), que sí avisa.

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
  // Borradores de la antigua revisión grupal (ya no se crean, pero pueden
  // quedar de proyectos anteriores).
  await supabase.from("group_review_drafts").delete().eq("project_id", id);
  await supabase.from("project_documents").delete().eq("project_id", id);

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
