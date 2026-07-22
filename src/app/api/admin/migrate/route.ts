import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";
import { Client } from "pg";



type Migration = {
  name: string;
  /** Table to probe for existence (defaults to `name`). */
  table?: string;
  /** Column to probe for existence (defaults to `id`). */
  column?: string;
  sql: string;
};

const SQL_MIGRATIONS: Migration[] = [
  {
    name: "project_messages",
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
  {
    // Marca las revisiones emitidas por la coordinación al cerrar una etapa en
    // nombre de los revisores. No cuentan para el cierre automático por número
    // de revisiones, pero sí se muestran al investigador.
    name: "reviews_is_editorial",
    table: "reviews",
    column: "is_editorial",
    sql: `
      ALTER TABLE reviews
        ADD COLUMN IF NOT EXISTS is_editorial boolean NOT NULL DEFAULT false;
    `.trim(),
  },
  {
    // Fecha en que el proyecto quedó resuelto (aprobado o rechazado). Sin
    // esto no hay forma de calcular cuánto tarda una revisión: projects solo
    // guardaba created_at. Queda null para los proyectos ya resueltos antes
    // de esta migración — el cálculo los ignora en vez de inventarlos.
    name: "projects_decided_at",
    table: "projects",
    column: "decided_at",
    sql: `
      ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS decided_at timestamptz;
    `.trim(),
  },
  {
    // Gestión de documentos: eliminar y reemplazar sin perder el expediente.
    // Un documento nunca se borra de verdad — se archiva, dejando quién y
    // cuándo. En un comité de ética el expediente tiene que seguir siendo
    // auditable si alguien reclama.
    name: "documents_archivado",
    table: "documents",
    column: "archived_at",
    sql: `
      ALTER TABLE documents
        ADD COLUMN IF NOT EXISTS archived_at  timestamptz,
        ADD COLUMN IF NOT EXISTS archived_by  text,
        ADD COLUMN IF NOT EXISTS uploaded_by  text,
        ADD COLUMN IF NOT EXISTS replaces_id  uuid REFERENCES documents(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS documents_activos_idx
        ON documents(project_id) WHERE archived_at IS NULL;
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
    // Try a lightweight SELECT to check the table (and column, if specified) exists
    const { error } = await supabase.from(m.table ?? m.name).select(m.column ?? "id").limit(0);
    if (!error) existing.push(m.name);
  }
  return existing;
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

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
  if (!(await isAdmin(req))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const existing = await checkExisting();
  const pending  = SQL_MIGRATIONS.filter((m) => !existing.includes(m.name));

  return NextResponse.json({
    existing,
    pending: pending.map(m => m.name),
    sql: pending.map(m => m.sql).join("\n\n"),
    allReady: pending.length === 0,
  });
}
