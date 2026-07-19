import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { clearSessionCookies, createSession, setSessionCookies } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data } = await supabase
    .from("researcher_accounts")
    .select("email, name")
    .eq("email", email.toLowerCase().trim())
    .eq("password", password)
    .maybeSingle();

  if (!data) {
    return NextResponse.json(
      { error: "Correo o clave incorrectos." },
      { status: 401 }
    );
  }

  const session = createSession(data.email, data.name ?? data.email, "investigador");
  return setSessionCookies(NextResponse.json({ ok: true }), session);
}

export async function DELETE() {
  return clearSessionCookies(NextResponse.json({ ok: true }));
}
