import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin, requireStaff } from "@/lib/auth";

// Datos personales del comité (nombres y correos): solo para personal con sesión.
export async function GET(req: NextRequest) {
  const { response } = await requireStaff(req);
  if (response) return response;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("reviewers")
    .select("*")
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const { name, email, expertise } = await req.json();
  if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("reviewers")
    .upsert({ name, email, expertise }, { onConflict: "email" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("reviewers").delete().eq("email", email);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
