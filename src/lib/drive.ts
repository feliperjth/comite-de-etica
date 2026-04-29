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
}, documents: { doc_type: string; file_name: string; url: string }[]): Promise<void> {
  const auth   = getAuth();
  const rootId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!auth || !rootId) {
    console.warn("Drive: faltan credenciales OAuth o GOOGLE_DRIVE_FOLDER_ID");
    return;
  }

  const drive = google.drive({ version: "v3", auth });

  // Year folder
  const year   = new Date(project.created_at).getFullYear().toString();
  const yearId = await getOrCreateFolder(drive, year, rootId);

  // Project folder: "CE-XXXXXX · Título"
  const folderName      = `${project.tracking_code} · ${project.title.slice(0, 60)}`;
  const projectFolderId = await getOrCreateFolder(drive, folderName, yearId);

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
    console.error("Drive: error subiendo metadata:", e);
  }

  // Upload each document
  for (const doc of documents) {
    const label     = DOC_LABELS[doc.doc_type] ?? doc.doc_type;
    const ext       = doc.file_name.split(".").pop() ?? "pdf";
    const driveName = `${label}.${ext}`;

    try {
      const fileRes = await fetch(doc.url);
      if (!fileRes.ok) {
        console.warn(`Drive: fetch falló para ${doc.doc_type} (${fileRes.status})`);
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
      console.log(`Drive: subido "${driveName}" (${buffer.length} bytes)`);
    } catch (e) {
      console.error(`Drive: error subiendo ${doc.doc_type}:`, e);
    }
  }
}
