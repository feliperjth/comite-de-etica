import { NextResponse } from "next/server";
import { getSupabaseAdmin, isConfigured } from "@/lib/supabase";

const BUCKET = "templates";

export async function GET() {
  if (!isConfigured) return NextResponse.json({ files: {} });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage.from(BUCKET).list("", { limit: 100 });

    if (error || !data) {
      console.error("[/api/templates] Storage list error:", error);
      return NextResponse.json({ files: {} });
    }

    const files: Record<string, string> = {};
    for (const f of data) {
      if (f.name.startsWith(".")) continue; // skip hidden/placeholder files
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(f.name);
      const docId = f.name.replace(/\.[^.]+$/, "");
      files[docId] = urlData.publicUrl;
    }

    return NextResponse.json({ files });
  } catch (e) {
    console.error("[/api/templates] Unexpected error:", e);
    return NextResponse.json({ files: {} });
  }
}
