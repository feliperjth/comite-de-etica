import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { clearSessionCookies, createSession, setSessionCookies } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
  }

  if (password !== process.env.REVIEWER_PASSWORD) {
    return NextResponse.json({ error: "Clave del comité incorrecta." }, { status: 401 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const supabase = getSupabaseServer();
  const { data: reviewer } = await supabase
    .from("reviewers")
    .select("name")
    .eq("email", normalizedEmail)
    .maybeSingle();

  // La sesión del comité también habilita /revisores/dashboard y /revisores/review.
  const session = createSession(normalizedEmail, reviewer?.name ?? "", "comite");
  return setSessionCookies(NextResponse.json({ ok: true }), session);
}

export async function DELETE() {
  return clearSessionCookies(NextResponse.json({ ok: true }));
}
