/**
 * Consulta de estado de revisión: el investigador pregunta a sus revisores
 * cómo va la evaluación, con un mensaje tipo, y ellos contestan desde el
 * portal o desde el correo (respuestas rápidas o texto libre).
 *
 * Se guarda como un mensaje más en `project_messages`, reconocible por su
 * texto inicial, para no tener que cambiar la base de datos. Este módulo no
 * usa nada de servidor: lo importan también los componentes del navegador.
 */

export const CONSULTA_PREFIJO = "Consulta de estado de revisión";
export const ESTADO_PREFIJO   = "Estado de la revisión:";

export const CONSULTA_TEXTO =
  `${CONSULTA_PREFIJO}: Hola, quisiera saber en qué etapa se encuentra la revisión de mi proyecto ` +
  "y si hay una fecha estimada para recibir el resultado. Muchas gracias.";

/** Respuestas rápidas que puede elegir el revisor. */
export const RESPUESTAS_RAPIDAS = [
  {
    key: "en_curso",
    label: "Estoy revisando",
    texto: `${ESTADO_PREFIJO} estoy revisando el proyecto y espero enviar mi evaluación durante esta semana.`,
  },
  {
    key: "casi",
    label: "Casi lista",
    texto: `${ESTADO_PREFIJO} mi evaluación está casi lista; recibirás el resultado en los próximos días.`,
  },
  {
    key: "mas_tiempo",
    label: "Necesito más tiempo",
    texto: `${ESTADO_PREFIJO} necesito un poco más de tiempo para completar la evaluación. Gracias por tu paciencia.`,
  },
] as const;

export type RespuestaRapida = (typeof RESPUESTAS_RAPIDAS)[number]["key"];

/** Una consulta abierta no se puede repetir hasta pasadas estas horas. */
export const CONSULTA_ESPERA_HORAS = 72;

export function esConsultaEstado(body: string | null | undefined): boolean {
  return (body ?? "").trimStart().startsWith(CONSULTA_PREFIJO);
}

export function esRespuestaEstado(body: string | null | undefined): boolean {
  return (body ?? "").trimStart().startsWith(ESTADO_PREFIJO);
}

/** Texto libre del revisor, con el encabezado de respuesta de estado. */
export function textoRespuestaLibre(texto: string): string {
  const t = texto.trim();
  return esRespuestaEstado(t) ? t : `${ESTADO_PREFIJO} ${t}`;
}

type MsgMin = { sender_type: string; body: string; created_at: string };

/**
 * La última consulta del investigador y si algún revisor respondió después.
 * `null` si nunca consultó.
 */
export function ultimaConsulta(messages: MsgMin[]): { at: string; respondida: boolean } | null {
  const ordenados = [...messages].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  let ultima: MsgMin | null = null;
  for (const m of ordenados) {
    if (m.sender_type === "investigador" && esConsultaEstado(m.body)) ultima = m;
  }
  if (!ultima) return null;
  const desde = Date.parse(ultima.created_at);
  const respondida = ordenados.some(
    (m) => m.sender_type !== "investigador" && Date.parse(m.created_at) > desde,
  );
  return { at: ultima.created_at, respondida };
}
