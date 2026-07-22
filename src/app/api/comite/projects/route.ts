import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { requireStaff } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { response } = await requireStaff(req);
  if (response) return response;

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ projects: data ?? [] });
}
