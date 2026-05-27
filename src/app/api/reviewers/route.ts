import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const ADMIN_EMAIL = "felipe.rojast@uai.cl";

function isAdmin(req: NextRequest) {
  const email = req.cookies.get("comite_email")?.value
             ?? req.cookies.get("reviewer_email")?.value;
  return email?.toLowerCase() === ADMIN_EMAIL;
}

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("reviewers")
    .select("*")
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
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
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("reviewers").delete().eq("email", email);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
