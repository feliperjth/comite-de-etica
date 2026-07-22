import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { canAccessProject, getSession } from "@/lib/auth";
import { canManageDocument, razonBloqueo } from "@/lib/documentAccess";
import {
  grupoDeDocumento, rondaDeDocumento, reemplazoAvisaAlInvestigador,
} from "@/lib/documentRounds";

// Canonical display order; unknown types go last, then by upload date
const DOC_ORDER = ["protocol", "consent", "assent", "instruments", "revision"];

/** Tipos que puede registrar el investigador desde el formulario público. */
const TIPOS_INVESTIGADOR = ["protocol", "consent", "assent", "instruments", "revision"];

/**
 * Registra un documento ya subido a Storage por el cliente.
 *
 * Autoriza de dos formas, porque hay dos escenarios distintos:
 *  - con sesión (revisor subiendo comentarios, investigador reenviando)
 *  - con el `code` de seguimiento, para el envío inicial, donde todavía no
 *    hay sesión (mismo criterio que /repair-document)
 *
 * Antes esta inserción la hacía el navegador con la clave anónima.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const docType  = typeof body.doc_type  === "string" ? body.doc_type.trim()  : "";
  const fileName = typeof body.file_name === "string" ? body.file_name.trim() : "";
  const filePath = typeof body.file_path === "string" ? body.file_path.trim() : null;
  const code     = typeof body.code      === "string" ? body.code.trim()      : "";

  if (!docType || !fileName) {
    return NextResponse.json({ error: "Faltan doc_type o file_name" }, { status: 400 });
  }
  // file_path puede ser null (subida fallida que se repara luego), pero si
  // viene tiene que apuntar dentro de la carpeta de este proyecto.
  if (filePath && !filePath.startsWith(`${id}/`)) {
    return NextResponse.json({ error: "La ruta no pertenece a este proyecto" }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  const { data: project } = await supabase
    .from("projects")
    .select("researcher_email, tracking_code")
    .eq("id", id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const session = await getSession(req);
  const porSesion = !!session && canAccessProject(session, project);
  const porCodigo = !!code && project.tracking_code === code.toUpperCase();

  if (!porSesion && !porCodigo) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Sin sesión de personal del comité no se pueden registrar documentos de
  // revisor: si no, cualquiera con el código colaría un "comentario del
  // revisor" en el expediente.
  const esStaff = session?.role === "revisor" || session?.role === "comite" || session?.role === "admin";
  if (!esStaff && !TIPOS_INVESTIGADOR.includes(docType)) {
    return NextResponse.json({ error: "Tipo de documento no permitido" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      project_id:  id,
      doc_type:    docType,
      file_name:   fileName,
      file_path:   filePath,
      // Autoría, para saber quién puede gestionarlo luego. Se toma de la
      // sesión, no del cuerpo: si viniera del cliente, cualquiera podría
      // atribuirse el documento de otro.
      uploaded_by: session?.email ?? project.researcher_email ?? null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  // Service-role client so reviewers/comité always see every document
  // regardless of RLS; falls back to anon if the key isn't set.
  const supabase = getSupabaseServer();

  // Un investigador solo puede ver los documentos de sus propios proyectos.
  const { data: project } = await supabase
    .from("projects")
    .select("researcher_email, status, current_round")
    .eq("id", id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  if (!canAccessProject(session, project)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Por defecto se omiten los documentos con comentarios del revisor, que se
  // muestran en su propia sección. Con ?type= se piden explícitamente (y
  // ?round= acota a una ronda, que va en la ruta de Storage); con ?scope=all
  // vienen junto al resto, para los paneles de gestión.
  const filtros = req.nextUrl.searchParams;
  const tipo    = filtros.get("type");
  const ronda   = filtros.get("round");
  const todos   = filtros.get("scope") === "all";

  let query = supabase
    .from("documents")
    .select("*")
    .eq("project_id", id)
    .is("archived_at", null) // los archivados son historial, no expediente vivo
    .order("created_at", { ascending: true });

  if (tipo) {
    query = query.eq("doc_type", tipo);
    if (ronda) query = query.like("file_path", `%/review-feedback/r${ronda}/%`);
  } else if (!todos) {
    query = query.neq("doc_type", "review_feedback");
  }

  const { data: docs, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = (docs ?? [])
    .map((d) => {
      let url: string | null = null;
      if (d.file_path) {
        const { data } = supabase.storage
          .from("documents")
          .getPublicUrl(d.file_path);
        url = data.publicUrl;
      }
      return {
        id:        d.id,
        doc_type:  d.doc_type,
        file_name: d.file_name,
        file_path: d.file_path ?? null,
        url,
        uploaded_by: d.uploaded_by ?? null,
        // Grupo y ronda los resuelve el servidor: el panel los pinta tal cual
        // en vez de volver a interpretar las rutas de Storage por su cuenta.
        grupo: grupoDeDocumento(d),
        ronda: rondaDeDocumento(d),
        // Si al reemplazarlo se avisará por correo al investigador, para que
        // el revisor lo sepa ANTES de confirmar.
        avisaAlInvestigador: reemplazoAvisaAlInvestigador(project, d),
        // La UI solo pinta los botones; quien decide de verdad es el
        // endpoint de gestión, que vuelve a comprobarlo contra la sesión.
        canManage:  canManageDocument(session, project, d),
        bloqueo:    razonBloqueo(session, project, d),
      };
    })
    // Investigador antes que revisores, rondas en orden y, dentro de cada una,
    // el orden canónico del expediente.
    .sort((a, b) => {
      if (a.grupo !== b.grupo) return a.grupo === "investigador" ? -1 : 1;
      if (a.ronda !== b.ronda) return a.ronda - b.ronda;
      const ia = DOC_ORDER.indexOf(a.doc_type);
      const ib = DOC_ORDER.indexOf(b.doc_type);
      return (ia === -1 ? DOC_ORDER.length : ia) - (ib === -1 ? DOC_ORDER.length : ib);
    });

  return NextResponse.json({ documents: result });
}
