import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

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

  const response = NextResponse.json({ ok: true, name: resolvedName });
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
  response.cookies.set("reviewer_name",  resolvedName, cookieOpts);
  response.cookies.set("reviewer_email", email ?? "",  cookieOpts);

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  const clear = { maxAge: 0, path: "/", sameSite: "lax" as const };
  response.cookies.set("reviewer_session", "", clear);
  response.cookies.set("reviewer_name",    "", clear);
  response.cookies.set("reviewer_email",   "", clear);
  return response;
}
