import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reviewers")
    .select("*")
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { name, email, expertise } = await req.json();
  if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reviewers")
    .upsert({ name, email, expertise }, { onConflict: "email" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
