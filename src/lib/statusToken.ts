import crypto from "crypto";

/**
 * Enlace firmado para que un revisor responda una consulta de estado desde el
 * correo, sin iniciar sesión. El enlace identifica proyecto, revisor y
 * consulta, y caduca a los 30 días.
 */

const VIGENCIA_MS = 30 * 24 * 60 * 60 * 1000;

function secreto(): string {
  const s = process.env.REVIEWER_SESSION_TOKEN || process.env.CERT_SECRET;
  if (!s) throw new Error("Falta REVIEWER_SESSION_TOKEN para firmar los enlaces de respuesta.");
  return s;
}

export type DatosEnlace = { projectId: string; reviewer: string; requestId: string; issuedAt: number };

function firma(d: DatosEnlace): string {
  return crypto
    .createHmac("sha256", secreto())
    .update(`estado|${d.projectId}|${d.reviewer}|${d.requestId}|${d.issuedAt}`)
    .digest("base64url");
}

export function crearEnlaceRespuesta(d: Omit<DatosEnlace, "issuedAt">): string {
  const datos: DatosEnlace = { ...d, issuedAt: Date.now() };
  const payload = Buffer.from(JSON.stringify(datos)).toString("base64url");
  return `${payload}.${firma(datos)}`;
}

export function leerEnlaceRespuesta(token: string | null | undefined): DatosEnlace | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const datos = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as DatosEnlace;
    if (!datos.projectId || !datos.reviewer || !datos.requestId || !datos.issuedAt) return null;
    const esperada = Buffer.from(firma(datos));
    const recibida = Buffer.from(sig);
    if (esperada.length !== recibida.length || !crypto.timingSafeEqual(esperada, recibida)) return null;
    if (Date.now() - datos.issuedAt > VIGENCIA_MS) return null;
    return datos;
  } catch {
    return null;
  }
}
