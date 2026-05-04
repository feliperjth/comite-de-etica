import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import {
  sendEmail,
  buildRejectedEmail,
  buildReviewerAssignedEmail,
  buildApprovalEmail,
  buildMacarenaEmail,
  buildCoordinatorApprovalEmail,
} from "@/lib/email";
import { generateCertToken } from "@/app/api/certify/route";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body   = await request.json();
  const supabase = getSupabase();

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
      sendEmail(
        macarenaEmail,
        `Solicitud certificado de ética · ${prev.title}`,
        buildMacarenaEmail(prev, origin, certToken),
        prev.researcher_email,
      ).catch(() => {});
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

  // ── Trigger: revisor asignado ────────────────────────────────────
  const newReviewers: string[] = [];
  if (prev && body.reviewer  !== undefined && body.reviewer  !== prev.reviewer)  newReviewers.push(body.reviewer);
  if (prev && body.reviewer2 !== undefined && body.reviewer2 !== prev.reviewer2) newReviewers.push(body.reviewer2);

  for (const name of newReviewers.filter(Boolean)) {
    // Look up reviewer email from reviews table (they must have logged in before)
    const { data: rev } = await supabase
      .from("reviews")
      .select("reviewer_email")
      .ilike("reviewer_name", name)
      .limit(1)
      .maybeSingle();

    if (rev?.reviewer_email) {
      sendEmail(
        rev.reviewer_email,
        `Proyecto asignado para revisión · ${data.title}`,
        buildReviewerAssignedEmail(data, name, origin),
      ).catch(() => {});
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabase();

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
