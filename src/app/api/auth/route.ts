import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { clearSessionCookies, createSession, setSessionCookies } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { password, email } = await request.json();

  if (password !== process.env.REVIEWER_PASSWORD) {
    return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  }

  // Look up name from reviewers table
  const supabase = getSupabase();
  const { data: reviewer } = await supabase
    .from("reviewers")
    .select("name")
    .eq("email", (email ?? "").toLowerCase().trim())
    .maybeSingle();

  const resolvedName = reviewer?.name ?? "";

  const session = createSession(email ?? "", resolvedName, "revisor");
  return setSessionCookies(NextResponse.json({ ok: true, name: resolvedName }), session);
}

export async function DELETE() {
  return clearSessionCookies(NextResponse.json({ ok: true }));
}
