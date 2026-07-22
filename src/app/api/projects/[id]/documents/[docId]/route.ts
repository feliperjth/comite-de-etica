import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { canAccessProject, getSession } from "@/lib/auth";
import { canManageDocument, razonBloqueo } from "@/lib/documentAccess";

/**
 * Gestión de un documento del expediente.
 *
 *   DELETE  → lo archiva (no se borra: queda el registro de quién y cuándo)
 *   PUT     → lo sustituye por otro que el cliente ya subió a Storage
 *
 * La autorización sale siempre de la cookie firmada y de lo que dice la base,
 * nunca del cuerpo de la petición: el `documents` es escribible por el cliente
 * con la clave anónima, así que nada de lo que llegue aquí es de fiar.
 */
async function cargarContexto(req: NextRequest, id: string, docId: string) {
  const session = await getSession(req);
  if (!session) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };

  const supabase = getSupabaseServer();

  const { data: project } = await supabase
    .from("projects")
    .select("id, researcher_email, status")
    .eq("id", id)
    .maybeSingle();
  if (!project) return { error: NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 }) };
  if (!canAccessProject(session, project)) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 403 }) };
  }

  const { data: doc } = await supabase
    .from("documents")
    .select("*")
    .eq("id", docId)
    .eq("project_id", id) // el documento tiene que ser de ESTE proyecto
    .maybeSingle();
  if (!doc) return { error: NextResponse.json({ error: "Documento no encontrado" }, { status: 404 }) };

  if (!canManageDocument(session, project, doc)) {
    return {
      error: NextResponse.json(
        { error: razonBloqueo(session, project, doc) ?? "No autorizado" },
        { status: 403 },
      ),
    };
  }

  return { session, supabase, project, doc };
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { id, docId } = await params;
  const ctx = await cargarContexto(req, id, docId);
  if (ctx.error) return ctx.error;

  const { error } = await ctx.supabase
    .from("documents")
    .update({ archived_at: new Date().toISOString(), archived_by: ctx.session.email })
    .eq("id", docId)
    .eq("project_id", id)
    .is("archived_at", null); // no re-archivar uno ya archivado

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, archived: docId });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { id, docId } = await params;
  const ctx = await cargarContexto(req, id, docId);
  if (ctx.error) return ctx.error;

  const body = await req.json().catch(() => null);
  const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
  const filePath = typeof body?.filePath === "string" ? body.filePath.trim() : "";
  if (!fileName || !filePath) {
    return NextResponse.json({ error: "Faltan fileName o filePath" }, { status: 400 });
  }

  // El archivo nuevo tiene que vivir bajo la carpeta de este proyecto; si no,
  // se podría apuntar la fila al archivo de otro expediente.
  if (!filePath.startsWith(`${id}/`)) {
    return NextResponse.json({ error: "La ruta no pertenece a este proyecto" }, { status: 400 });
  }

  // El tipo lo hereda del documento sustituido: reemplazar no puede convertir
  // un consentimiento en un protocolo.
  const { data: nuevo, error: errInsert } = await ctx.supabase
    .from("documents")
    .insert({
      project_id:  id,
      doc_type:    ctx.doc.doc_type,
      file_name:   fileName,
      file_path:   filePath,
      uploaded_by: ctx.session.email,
      replaces_id: docId,
    })
    .select("id")
    .single();

  if (errInsert) return NextResponse.json({ error: errInsert.message }, { status: 500 });

  const { error: errArchivo } = await ctx.supabase
    .from("documents")
    .update({ archived_at: new Date().toISOString(), archived_by: ctx.session.email })
    .eq("id", docId)
    .eq("project_id", id);

  if (errArchivo) {
    // El nuevo ya existe pero el viejo sigue vivo: quedarían los dos visibles.
    // Se deshace la inserción para no dejar el expediente duplicado.
    await ctx.supabase.from("documents").delete().eq("id", nuevo.id);
    return NextResponse.json({ error: errArchivo.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, replaced: docId, id: nuevo.id });
}
