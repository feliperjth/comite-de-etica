import EstadoRespuesta from "./EstadoRespuesta";

/**
 * Respuesta a una consulta de estado desde el enlace del correo. No requiere
 * sesión: el enlace firmado identifica al revisor (ver /api/status-reply).
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; r?: string }>;
}) {
  const { t, r } = await searchParams;
  return <EstadoRespuesta token={t ?? ""} preseleccion={r ?? ""} />;
}
