import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const ADMIN_EMAIL = "felipe.rojast@uai.cl";
const BUCKET      = "templates";

function isAdmin(req: NextRequest) {
  return req.cookies.get("comite_email")?.value?.toLowerCase() === ADMIN_EMAIL;
}

// GET — list current templates with public URLs
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const supabase = getSupabaseAdmin();

  // Auto-create bucket if missing
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find(b => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: true });
  }

  const { data, error } = await supabase.storage.from(BUCKET).list("", { limit: 50 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const files: Record<string, string> = {};
  for (const f of data ?? []) {
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(f.name);
    files[f.name.replace(/\.[^.]+$/, "")] = urlData.publicUrl;
  }
  return NextResponse.json({ files });
}

// POST — upload or replace a template
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const formData = await req.formData();
  const file  = formData.get("file")  as File   | null;
  const docId = formData.get("docId") as string | null;
  if (!file || !docId) return NextResponse.json({ error: "Falta archivo o tipo" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const ext  = file.name.split(".").pop() ?? "pdf";
  const path = `${docId}.${ext}`;

  // Remove previous version of same doc (any extension)
  const { data: existing } = await supabase.storage.from(BUCKET).list("");
  const toRemove = (existing ?? [])
    .filter((f: { name: string }) => f.name.replace(/\.[^.]+$/, "") === docId)
    .map((f: { name: string }) => f.name);
  if (toRemove.length > 0) await supabase.storage.from(BUCKET).remove(toRemove);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ ok: true, url: urlData.publicUrl });
}

// DELETE — remove a template
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { docId } = await req.json();
  if (!docId) return NextResponse.json({ error: "Falta docId" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.storage.from(BUCKET).list("");
  const toRemove = (existing ?? [])
    .filter((f: { name: string }) => f.name.replace(/\.[^.]+$/, "") === docId)
    .map((f: { name: string }) => f.name);
  if (toRemove.length > 0) await supabase.storage.from(BUCKET).remove(toRemove);

  return NextResponse.json({ ok: true });
}
