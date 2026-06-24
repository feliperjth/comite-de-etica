/**
 * Sanitiza un nombre de archivo para usarlo como CLAVE de Supabase Storage.
 *
 * Supabase Storage rechaza claves con caracteres no-ASCII (tildes, "n" con
 * virgulilla, guion largo, etc.) devolviendo un error "Invalid key". Si no se
 * sanea, la subida falla y el documento queda registrado sin archivo
 * ("Archivo no disponible"). Esta funcion quita acentos, descarta lo no-ASCII
 * y reemplaza cualquier caracter no permitido por "_".
 *
 * IMPORTANTE: usar SOLO para el path de Storage. El nombre original del
 * archivo debe guardarse aparte (columna `file_name`) para mostrarlo tal cual
 * al usuario.
 */
export function safeStorageName(name: string): string {
  const safe = name
    .normalize("NFD")                   // separa letra base + acento combinante
    .replace(/[^\x00-\x7F]/g, "")       // descarta acentos (ya separados) y no-ASCII
    .replace(/[^a-zA-Z0-9._-]+/g, "_")  // resto no permitido -> "_"
    .replace(/_+/g, "_")                // colapsa "__"
    .replace(/^[_.]+|_+$/g, "");        // recorta "_"/"." de los bordes
  return safe || "archivo";
}
