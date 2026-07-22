import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { ADMIN_NAME, getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ type: "none" });

  if (session.role === "admin") {
    return NextResponse.json({ type: "admin", name: ADMIN_NAME, email: session.email });
  }

  // El nombre se resuelve contra la base para reflejar cambios de perfil
  // posteriores al inicio de sesión.
  const supabase = getSupabaseServer();
  const table = session.role === "investigador" ? "researcher_accounts" : "reviewers";
  const { data } = await supabase
    .from(table)
    .select("name")
    .eq("email", session.email)
    .maybeSingle();

  return NextResponse.json({
    type: session.role,
    name: data?.name ?? session.name ?? session.email,
    email: session.email,
  });
}
