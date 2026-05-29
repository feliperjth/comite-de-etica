import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { Client } from "pg";

const ADMIN_EMAIL = "felipe.rojast@uai.cl";

function isAdmin(req: NextRequest) {
  const email = req.cookies.get("comite_email")?.value
             ?? req.cookies.get("reviewer_email")?.value;
  return email?.toLowerCase() === ADMIN_EMAIL;
}

const SQL_MIGRATIONS = [
  {
    name: "project_messages",
    check: "SELECT 1 FROM information_schema.tables WHERE table_name = 'project_messages' AND table_schema = 'public'",
    sql: `
      CREATE TABLE IF NOT EXISTS project_messages (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
        sender_type text NOT NULL CHECK (sender_type IN ('investigador', 'revisor1', 'revisor2')),
        body text NOT NULL,
        created_at timestamptz DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS project_messages_project_id_idx ON project_messages(project_id);
    `.trim(),
  },
  {
    name: "app_settings",
    check: "SELECT 1 FROM information_schema.tables WHERE table_name = 'app_settings' AND table_schema = 'public'",
    sql: `
      CREATE TABLE IF NOT EXISTS app_settings (
        key text PRIMARY KEY,
        value text NOT NULL,
        updated_at timestamptz DEFAULT now()
      );
      INSERT INTO app_settings (key, value)
        VALUES ('reviewer_assignment_mode', 'manual')
        ON CONFLICT (key) DO NOTHING;
    `.trim(),
  },
];

// ── Try pg direct connection ──────────────────────────────────────────────────
async function runViaPg(sqls: string[]): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const ref = url.replace("https://", "").replace(".supabase.co", "");
  const password = process.env.SUPABASE_DB_PASSWORD;

  if (!password) return { ok: false, error: "SUPABASE_DB_PASSWORD not set" };

  const client = new Client({
    host: `db.${ref}.supabase.co`,
    port: 5432,
    database: "postgres",
    user: "postgres",
    password,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    for (const sql of sqls) {
      await client.query(sql);
    }
    await client.end();
    return { ok: true };
  } catch (e: unknown) {
    try { await client.end(); } catch { /* ignore */ }
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Try via Supabase RPC (dblink_exec if extension available) ─────────────────
async function runViaRpc(sqls: string[]): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  for (const sql of sqls) {
    const { error } = await (supabase.rpc as Function)("dblink_exec", {
      connstr: "",
      sql,
    });
    if (error && !error.message?.includes("already exists")) {
      return { ok: false, error: error.message };
    }
  }
  return { ok: true };
}

// ── Check which tables already exist ─────────────────────────────────────────
async function checkExisting(): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const existing: string[] = [];

  for (const m of SQL_MIGRATIONS) {
    // Try a lightweight SELECT to check existence
    const { error } = await supabase.from(m.name).select("id").limit(0);
    if (!error) existing.push(m.name);
  }
  return existing;
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const existing = await checkExisting();
  const pending  = SQL_MIGRATIONS.filter((m) => !existing.includes(m.name));

  if (pending.length === 0) {
    return NextResponse.json({ ok: true, message: "Todas las tablas ya existen.", existing });
  }

  const sqls = pending.map((m) => m.sql);

  // Method 1: direct pg connection
  const pgResult = await runViaPg(sqls);
  if (pgResult.ok) {
    return NextResponse.json({ ok: true, message: `Tablas creadas: ${pending.map(m => m.name).join(", ")}`, method: "pg" });
  }

  // Method 2: RPC via dblink
  const rpcResult = await runViaRpc(sqls);
  if (rpcResult.ok) {
    return NextResponse.json({ ok: true, message: `Tablas creadas: ${pending.map(m => m.name).join(", ")}`, method: "rpc" });
  }

  // Fallback: return SQL for manual execution
  return NextResponse.json({
    ok: false,
    needsManual: true,
    pending: pending.map(m => m.name),
    sql: pending.map(m => m.sql).join("\n\n"),
    errors: { pg: pgResult.error, rpc: rpcResult.error },
  });
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const existing = await checkExisting();
  const pending  = SQL_MIGRATIONS.filter((m) => !existing.includes(m.name));

  return NextResponse.json({
    existing,
    pending: pending.map(m => m.name),
    sql: pending.map(m => m.sql).join("\n\n"),
    allReady: pending.length === 0,
  });
}
