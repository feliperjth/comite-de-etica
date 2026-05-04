import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const ADMIN_EMAIL = "felipe.rojast@uai.cl";
const ADMIN_NAME  = "Felipe Rojas";

export async function GET(req: NextRequest) {
  // Investigador session
  const investigadorEmail = req.cookies.get("investigador_email")?.value;
  if (investigadorEmail) {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("researcher_accounts")
      .select("name")
      .eq("email", investigadorEmail)
      .maybeSingle();
    return NextResponse.json({
      type: "investigador",
      name: data?.name ?? investigadorEmail,
      email: investigadorEmail,
    });
  }

  // Comité session (login via /comite)
  const comiteEmail = req.cookies.get("comite_email")?.value;
  if (comiteEmail) {
    if (comiteEmail.toLowerCase() === ADMIN_EMAIL) {
      return NextResponse.json({ type: "admin", name: ADMIN_NAME, email: comiteEmail });
    }
    const supabase = getSupabase();
    const { data: reviewer } = await supabase
      .from("reviewers").select("name").eq("email", comiteEmail).maybeSingle();
    return NextResponse.json({
      type: "comite",
      name: reviewer?.name ?? comiteEmail,
      email: comiteEmail,
    });
  }

  // Reviewer session (login via /revisores)
  const reviewerEmail = req.cookies.get("reviewer_email")?.value;
  if (reviewerEmail) {
    if (reviewerEmail.toLowerCase() === ADMIN_EMAIL) {
      return NextResponse.json({ type: "admin", name: ADMIN_NAME, email: reviewerEmail });
    }
    const supabase = getSupabase();
    const { data: reviewer } = await supabase
      .from("reviewers").select("name").eq("email", reviewerEmail).maybeSingle();
    return NextResponse.json({
      type: "comite",
      name: reviewer?.name ?? reviewerEmail,
      email: reviewerEmail,
    });
  }

  return NextResponse.json({ type: "none" });
}
