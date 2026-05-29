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
  const { data } = await supabase.from("app_settings").select("key, value");
  const settings: Record<string, string> = {};
  for (const row of data ?? []) settings[row.key] = row.value;
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { key, value } = await req.json();
  if (!key || value === undefined) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
