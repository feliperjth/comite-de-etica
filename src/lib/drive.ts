import { google } from "googleapis";
import { Readable } from "stream";

const DOC_LABELS: Record<string, string> = {
  protocol:    "Protocolo de investigación",
  consent:     "Consentimiento informado",
  assent:      "Asentimiento informado",
  instruments: "Instrumentos y tests",
};

function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

function getAuth() {
  const clientId     = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, "https://developers.google.com/oauthplayground");
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

async function getOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId: string,
): Promise<string> {
  const safe = name.replace(/[/\\?%*:|"<>]/g, "-");
  const res = await drive.files.list({
    q: `name='${safe}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
  });
  if (res.data.files?.[0]?.id) return res.data.files[0].id;

  const folder = await drive.files.create({
    requestBody: { name: safe, mimeType: "application/vnd.google-apps.folder", parents: [parentId] },
    fields: "id",
  });
  return folder.data.id!;
}

/**
 * Resultado de una sincronización. Se devuelve en vez de tragarse los fallos:
 * si el refresh token de Google caduca (pasa cada 7 días mientras la pantalla
 * de consentimiento siga en "Testing"), quien llame tiene que poder notarlo.
 */
export type DriveSyncResult = {
  configured: boolean;
  uploaded: number;
  failed: number;
  total: number;
  errors: string[];
};

function describeError(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    const msg = String((e as { message: unknown }).message);
    // googleapis envuelve el invalid_grant del refresh token caducado
    if (msg.includes("invalid_grant")) {
      return "El refresh token de Google caducó o fue revocado — hay que regenerarlo";
    }
    return msg;
  }
  return String(e);
}

export async function uploadProjectToDrive(project: {
  id: string;
  title: string;
  tracking_code: string;
  researcher_name: string;
  researcher_email: string;
  project_type: string;
  theme: string;
  advisor_name: string | null;
  funding_type: string | null;
  funding_folio: string | null;
  created_at: string;
}, documents: { doc_type: string; file_name: string; url: string }[]): Promise<DriveSyncResult> {
  const auth   = getAuth();
  const rootId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!auth || !rootId) {
    const msg = "Faltan credenciales OAuth de Google o GOOGLE_DRIVE_FOLDER_ID";
    console.warn(`Drive: ${msg}`);
    return { configured: false, uploaded: 0, failed: 0, total: documents.length, errors: [msg] };
  }

  const drive  = google.drive({ version: "v3", auth });
  const errors: string[] = [];
  let uploaded = 0;
  let failed   = 0;

  // Carpeta del año y carpeta del proyecto ("CE-XXXXXX · Título"). Si esto
  // falla no hay dónde subir nada, así que se corta aquí con el motivo.
  let projectFolderId: string;
  try {
    const year   = new Date(project.created_at).getFullYear().toString();
    const yearId = await getOrCreateFolder(drive, year, rootId);

    const folderName = `${project.tracking_code} · ${project.title.slice(0, 60)}`;
    projectFolderId  = await getOrCreateFolder(drive, folderName, yearId);
  } catch (e) {
    const msg = describeError(e);
    console.error("Drive: no se pudo crear/abrir la carpeta del proyecto:", msg);
    return { configured: true, uploaded: 0, failed: documents.length, total: documents.length, errors: [msg] };
  }

  // Metadata text file
  const meta = [
    `Código:       ${project.tracking_code}`,
    `Título:       ${project.title}`,
    `Investigador: ${project.researcher_name} <${project.researcher_email}>`,
    `Tipo:         ${project.project_type}`,
    `Fecha envío:  ${new Date(project.created_at).toLocaleDateString("es-CL")}`,
    project.advisor_name ? `Profesor guía: ${project.advisor_name}` : "",
    project.funding_type && project.funding_type !== "none"
      ? `Financiamiento: ${project.funding_type === "fondecyt" ? "Fondecyt" : "Grant UAI"} ${project.funding_folio ?? ""}` : "",
  ].filter(Boolean).join("\n");

  try {
    await drive.files.create({
      requestBody: { name: "00_info_proyecto.txt", parents: [projectFolderId] },
      media: { mimeType: "text/plain", body: bufferToStream(Buffer.from(meta, "utf-8")) },
    });
  } catch (e) {
    const msg = describeError(e);
    console.error("Drive: error subiendo metadata:", msg);
    errors.push(`metadata: ${msg}`);
  }

  // Upload each document
  for (const doc of documents) {
    const label     = DOC_LABELS[doc.doc_type] ?? doc.doc_type;
    const ext       = doc.file_name.split(".").pop() ?? "pdf";
    const driveName = `${label}.${ext}`;

    try {
      const fileRes = await fetch(doc.url);
      if (!fileRes.ok) {
        const msg = `no se pudo descargar desde Storage (HTTP ${fileRes.status})`;
        console.warn(`Drive: ${doc.doc_type}: ${msg}`);
        failed++;
        errors.push(`${doc.doc_type}: ${msg}`);
        continue;
      }
      const buffer   = Buffer.from(await fileRes.arrayBuffer());
      const mimeType = ext === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      await drive.files.create({
        requestBody: { name: driveName, parents: [projectFolderId] },
        media: { mimeType, body: bufferToStream(buffer) },
      });
      uploaded++;
      console.log(`Drive: subido "${driveName}" (${buffer.length} bytes)`);
    } catch (e) {
      const msg = describeError(e);
      console.error(`Drive: error subiendo ${doc.doc_type}:`, msg);
      failed++;
      errors.push(`${doc.doc_type}: ${msg}`);
    }
  }

  return { configured: true, uploaded, failed, total: documents.length, errors };
}
