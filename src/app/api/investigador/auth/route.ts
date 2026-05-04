import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const cookieOpts = {
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7,
  path: "/",
  sameSite: "lax" as const,
};

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data } = await supabase
    .from("researcher_accounts")
    .select("email")
    .eq("email", email.toLowerCase().trim())
    .eq("password", password)
    .maybeSingle();

  if (!data) {
    return NextResponse.json(
      { error: "Correo o clave incorrectos." },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("investigador_email", email.toLowerCase().trim(), {
    ...cookieOpts,
    httpOnly: true,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("investigador_email", "", { maxAge: 0, path: "/", sameSite: "lax" as const });
  return res;
}
