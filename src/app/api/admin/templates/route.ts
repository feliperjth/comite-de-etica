import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const ADMIN_EMAIL = "felipe.rojast@uai.cl";

function isAdmin(req: NextRequest) {
  return req.cookies.get("comite_email")?.value?.toLowerCase() === ADMIN_EMAIL;
}

// GET — list current templates with public URLs
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const supabase = getSupabase();
  const { data, error } = await supabase.storage.from("templates").list("", { limit: 50 });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const files: Record<string, string> = {};
  for (const f of data ?? []) {
    const { data: urlData } = supabase.storage.from("templates").getPublicUrl(f.name);
    const id = f.name.replace(/\.[^.]+$/, "");
    files[id] = urlData.publicUrl;
  }

  return NextResponse.json({ files });
}

// POST — upload or replace a template (multipart/form-data)
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const formData = await req.formData();
  const file     = formData.get("file") as File | null;
  const docId    = formData.get("docId") as string | null;

  if (!file || !docId) return NextResponse.json({ error: "Falta archivo o tipo" }, { status: 400 });

  const ext      = file.name.split(".").pop() ?? "pdf";
  const path     = `${docId}.${ext}`;
  const supabase = getSupabase();

  // Remove any existing file for this doc type (all extensions)
  const { data: existing } = await supabase.storage.from("templates").list("");
  const toRemove = (existing ?? []).filter(f => f.name.replace(/\.[^.]+$/, "") === docId).map(f => f.name);
  if (toRemove.length > 0) await supabase.storage.from("templates").remove(toRemove);

  const buffer = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from("templates")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: urlData } = supabase.storage.from("templates").getPublicUrl(path);
  return NextResponse.json({ ok: true, url: urlData.publicUrl });
}

// DELETE — remove a template
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { docId } = await req.json();
  if (!docId) return NextResponse.json({ error: "Falta docId" }, { status: 400 });

  const supabase = getSupabase();
  const { data: existing } = await supabase.storage.from("templates").list("");
  const toRemove = (existing ?? []).filter(f => f.name.replace(/\.[^.]+$/, "") === docId).map(f => f.name);
  if (toRemove.length > 0) await supabase.storage.from("templates").remove(toRemove);

  return NextResponse.json({ ok: true });
}
