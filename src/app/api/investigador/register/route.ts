import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { createSession, setSessionCookies } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, name, password } = await req.json();

  if (!email || !name || !password) {
    return NextResponse.json({ error: "Todos los campos son obligatorios." }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "La clave debe tener al menos 6 caracteres." }, { status: 400 });
  }

  const supabase = getSupabase();

  // Check if account already exists
  const { data: existing } = await supabase
    .from("researcher_accounts")
    .select("email")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Ya existe una cuenta con ese correo. Inicia sesión." },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("researcher_accounts")
    .insert({ email: email.toLowerCase().trim(), name: name.trim(), password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const session = createSession(email, name.trim(), "investigador");
  return setSessionCookies(NextResponse.json({ ok: true }), session);
}
