import { NextResponse } from "next/server";
import { getSupabase, isConfigured } from "@/lib/supabase";

export async function GET() {
  if (!isConfigured) {
    return NextResponse.json({ status: "❌ Variables de entorno no detectadas" });
  }
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("projects").select("count").limit(1);
    if (error) return NextResponse.json({ status: "⚠️ Conectado pero tabla no existe", error: error.message });
    return NextResponse.json({ status: "✅ Conexión exitosa", data });
  } catch (e: unknown) {
    return NextResponse.json({ status: "❌ Error de conexión", error: e instanceof Error ? e.message : String(e) });
  }
}
