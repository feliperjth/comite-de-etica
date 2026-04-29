import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

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

  // Comité session
  const comiteEmail = req.cookies.get("comite_email")?.value;
  if (comiteEmail) {
    const supabase = getSupabase();
    const { data: anyReview } = await supabase
      .from("reviews")
      .select("reviewer_name")
      .eq("reviewer_email", comiteEmail)
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      type: "comite",
      name: anyReview?.reviewer_name ?? comiteEmail,
      email: comiteEmail,
    });
  }

  return NextResponse.json({ type: "none" });
}
