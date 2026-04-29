import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { password, name, email } = await request.json();

  if (password !== process.env.REVIEWER_PASSWORD) {
    return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  const cookieOpts = {
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "lax" as const,
  };

  response.cookies.set("reviewer_session", process.env.REVIEWER_SESSION_TOKEN!, {
    ...cookieOpts,
    httpOnly: true,
  });
  // name and email stored as readable cookies (not httpOnly) so the client can read them
  response.cookies.set("reviewer_name",  name  ?? "", cookieOpts);
  response.cookies.set("reviewer_email", email ?? "", cookieOpts);

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("reviewer_session");
  response.cookies.delete("reviewer_name");
  response.cookies.delete("reviewer_email");
  return response;
}
