import { NextRequest, NextResponse } from "next/server";

/**
 * Sesiones firmadas (HMAC-SHA256).
 *
 * Antes la autorización leía cookies de correo (`comite_email`, `reviewer_email`,
 * `investigador_email`) y confiaba en su contenido. Una cookie la escribe el
 * cliente, así que cualquiera podía enviar `comite_email=<admin>` y pasar como
 * coordinador. `httpOnly` no protege de esto: solo impide que JS lea la cookie,
 * no que alguien la envíe a mano.
 *
 * Ahora el servidor solo confía en `ce_session`, que lleva firma. Las cookies de
 * correo/nombre siguen existiendo para que la UI muestre datos sin pedirlos,
 * pero NUNCA deben usarse para decidir permisos.
 *
 * Se usa Web Crypto (no `node:crypto`) para que funcione igual en el proxy —
 * que corre en el runtime edge — y en los route handlers.
 */

export const ADMIN_EMAIL = "felipe.rojast@uai.cl";
export const ADMIN_NAME = "Felipe Rojas";

export const SESSION_COOKIE = "ce_session";

const MAX_AGE = 60 * 60 * 24 * 7; // 7 días, igual que las cookies anteriores

export type Role = "investigador" | "revisor" | "comite" | "admin";

export type Session = {
  email: string;
  name: string;
  role: Role;
  exp: number; // epoch en segundos
};

const encoder = new TextEncoder();

function secret(): string {
  const value = process.env.REVIEWER_SESSION_TOKEN;
  if (!value) throw new Error("Falta REVIEWER_SESSION_TOKEN: no se pueden firmar sesiones.");
  return value;
}

function b64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// El ArrayBuffer explícito evita que el tipo sea ArrayBufferLike, que
// crypto.subtle no acepta como BufferSource.
function b64urlDecode(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 ? "=".repeat(4 - (normalized.length % 4)) : "";
  const binary = atob(normalized + padding);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(usage: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usage,
  );
}

/** Devuelve el valor firmado `<payload>.<firma>` para guardar en la cookie. */
export async function signSession(session: Session): Promise<string> {
  const payload = b64urlEncode(encoder.encode(JSON.stringify(session)));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(["sign"]), encoder.encode(payload));
  return `${payload}.${b64urlEncode(new Uint8Array(signature))}`;
}

/** Verifica firma y expiración. Devuelve null si el token no es de fiar. */
export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;

  const separator = token.lastIndexOf(".");
  if (separator < 1) return null;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  let valid: boolean;
  try {
    // subtle.verify compara en tiempo constante; no comparar strings a mano.
    valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(["verify"]),
      b64urlDecode(signature),
      encoder.encode(payload),
    );
  } catch {
    return null; // base64 corrupto
  }
  if (!valid) return null;

  try {
    const session = JSON.parse(new TextDecoder().decode(b64urlDecode(payload))) as Session;
    if (!session?.email || !session?.role) return null;
    if (typeof session.exp !== "number" || session.exp * 1000 < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

/** Lee y verifica la sesión de la petición. */
export function getSession(req: NextRequest): Promise<Session | null> {
  return verifySession(req.cookies.get(SESSION_COOKIE)?.value);
}

export function createSession(email: string, name: string, role: Role): Session {
  const normalized = email.toLowerCase().trim();
  return {
    email: normalized,
    name,
    // El rol admin se decide aquí, al iniciar sesión, y queda dentro de la firma.
    role: normalized === ADMIN_EMAIL ? "admin" : role,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE,
  };
}

export const cookieOpts = {
  secure: process.env.NODE_ENV === "production",
  maxAge: MAX_AGE,
  path: "/",
  sameSite: "lax" as const,
};

/**
 * Escribe la sesión firmada y las cookies de display que lee el cliente.
 * Las de display son solo presentación: el servidor no las usa para permisos.
 */
export async function setSessionCookies(res: NextResponse, session: Session): Promise<NextResponse> {
  res.cookies.set(SESSION_COOKIE, await signSession(session), { ...cookieOpts, httpOnly: true });

  if (session.role === "investigador") {
    res.cookies.set("investigador_email", session.email, cookieOpts);
  } else {
    res.cookies.set("reviewer_email", session.email, cookieOpts);
    res.cookies.set("reviewer_name", session.name, cookieOpts);
    if (session.role === "comite" || session.role === "admin") {
      res.cookies.set("comite_email", session.email, cookieOpts);
    }
  }
  return res;
}

export function clearSessionCookies(res: NextResponse): NextResponse {
  const clear = { maxAge: 0, path: "/", sameSite: "lax" as const };
  for (const name of [
    SESSION_COOKIE,
    "reviewer_session",
    "reviewer_email",
    "reviewer_name",
    "comite_email",
    "investigador_email",
  ]) {
    res.cookies.set(name, "", clear);
  }
  return res;
}

// ── Guardas ────────────────────────────────────────────────────────────────

function denied() {
  return NextResponse.json({ error: "No autorizado" }, { status: 403 });
}

/**
 * Exige una sesión con alguno de los roles indicados.
 * Devuelve `{ session }` si pasa, o `{ response }` con el 403 a retornar.
 */
export async function requireRole(
  req: NextRequest,
  ...roles: Role[]
): Promise<{ session: Session; response?: never } | { session?: never; response: NextResponse }> {
  const session = await getSession(req);
  if (!session) return { response: denied() };
  // El admin puede hacer todo lo que puedan revisor y comité.
  if (session.role === "admin" || roles.includes(session.role)) return { session };
  return { response: denied() };
}

/** Variante booleana, para sitios que ya construyen su propia respuesta 403. */
export async function isAdmin(req: NextRequest): Promise<boolean> {
  return (await getSession(req))?.role === "admin";
}

export async function requireAdmin(
  req: NextRequest,
): Promise<{ session: Session; response?: never } | { session?: never; response: NextResponse }> {
  return requireRole(req, "admin");
}

/**
 * ¿Puede esta sesión ver/tocar este proyecto?
 * El personal del comité accede a todos; un investigador, solo a los suyos.
 */
export function canAccessProject(
  session: Session,
  project: { researcher_email?: string | null },
): boolean {
  if (session.role !== "investigador") return true;
  return project.researcher_email?.toLowerCase() === session.email;
}

/** Personal del comité: revisor, miembro del comité o admin. */
export async function requireStaff(
  req: NextRequest,
): Promise<{ session: Session; response?: never } | { session?: never; response: NextResponse }> {
  return requireRole(req, "revisor", "comite");
}
