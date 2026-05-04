import { NextRequest, NextResponse } from "next/server";

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

  if (password !== process.env.REVIEWER_PASSWORD) {
    return NextResponse.json({ error: "Clave del comité incorrecta." }, { status: 401 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const res = NextResponse.json({ ok: true });

  res.cookies.set("comite_email", normalizedEmail, { ...cookieOpts, httpOnly: true });

  // Also set reviewer cookies so /revisores/dashboard and /revisores/review work
  res.cookies.set("reviewer_session", process.env.REVIEWER_SESSION_TOKEN!, { ...cookieOpts, httpOnly: true });
  res.cookies.set("reviewer_email", normalizedEmail, cookieOpts);

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  const clear = { maxAge: 0, path: "/", sameSite: "lax" as const };
  res.cookies.set("comite_email",      "", clear);
  res.cookies.set("reviewer_session",  "", clear);
  res.cookies.set("reviewer_name",     "", clear);
  res.cookies.set("reviewer_email",    "", clear);
  return res;
}
