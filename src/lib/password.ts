import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt) as (
  password: string, salt: Buffer, keylen: number,
) => Promise<Buffer>;

const PREFIJO = "scrypt$";
const LARGO   = 64;

/**
 * Hashea una clave para guardarla. Formato: `scrypt$<salt hex>$<hash hex>`.
 *
 * scrypt viene en Node, no hace falta dependencia nueva, y está pensado
 * justamente para esto: es caro de calcular a propósito, así que probar
 * millones de claves por fuerza bruta deja de ser gratis.
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(plain, salt, LARGO);
  return `${PREFIJO}${salt.toString("hex")}$${hash.toString("hex")}`;
}

/** ¿Está ya hasheada, o es texto plano de antes de esta migración? */
export function estaHasheada(stored: string): boolean {
  return stored.startsWith(PREFIJO);
}

/**
 * Compara una clave con lo guardado.
 *
 * Acepta también las claves en texto plano que quedaron de antes, para que
 * nadie se quede fuera; quien llama debe re-hashearlas al entrar (ver
 * `necesitaRehash`). La comparación es en tiempo constante: comparar con
 * `===` filtra información por el tiempo que tarda en fallar.
 */
export async function verifyPassword(plain: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;

  if (!estaHasheada(stored)) {
    const a = Buffer.from(plain);
    const b = Buffer.from(stored);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  const [, saltHex, hashHex] = stored.split("$");

  // Validación estricta antes de convertir: `Buffer.from("zz", "hex")` no
  // lanza, devuelve un buffer VACÍO. Sin esto, un hash corrupto o truncado
  // haría que timingSafeEqual comparase vacío con vacío y diera por buena
  // cualquier contraseña.
  const hexValido = (s: string | undefined, bytes: number) =>
    !!s && s.length === bytes * 2 && /^[0-9a-f]+$/i.test(s);

  if (!hexValido(saltHex, 16) || !hexValido(hashHex, LARGO)) return false;

  const esperado  = Buffer.from(hashHex, "hex");
  const calculado = await scryptAsync(plain, Buffer.from(saltHex, "hex"), LARGO);
  return timingSafeEqual(esperado, calculado);
}

/** Tras un login correcto, ¿hay que guardar la versión hasheada? */
export function necesitaRehash(stored: string | null): boolean {
  return !!stored && !estaHasheada(stored);
}
