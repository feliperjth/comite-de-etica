import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { clearSessionCookies, createSession, setSessionCookies } from "@/lib/auth";
import { hashPassword, necesitaRehash, verifyPassword } from "@/lib/password";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const correo = email.toLowerCase().trim();

  // Se busca solo por correo y se compara la clave en el servidor: con hashes
  // ya no se puede filtrar por igualdad en la consulta.
  const { data } = await supabase
    .from("researcher_accounts")
    .select("email, name, password")
    .eq("email", correo)
    .maybeSingle();

  if (!data || !(await verifyPassword(password, data.password))) {
    return NextResponse.json(
      { error: "Correo o clave incorrectos." },
      { status: 401 }
    );
  }

  // Migración transparente: la primera vez que entra alguien cuya clave
  // seguía en texto plano, se guarda ya hasheada. Si falla, no se le bloquea
  // la sesión: el login fue correcto.
  if (necesitaRehash(data.password)) {
    const { error } = await supabase
      .from("researcher_accounts")
      .update({ password: await hashPassword(password) })
      .eq("email", correo);
    if (error) console.warn(`No se pudo hashear la clave de ${correo}:`, error.message);
  }

  const session = createSession(data.email, data.name ?? data.email, "investigador");
  return setSessionCookies(NextResponse.json({ ok: true }), session);
}

export async function DELETE() {
  return clearSessionCookies(NextResponse.json({ ok: true }));
}
