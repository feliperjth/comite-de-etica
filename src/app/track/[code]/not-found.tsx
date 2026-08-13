import TrackNotFound from "@/components/TrackNotFound";

/**
 * Lo renderiza Next cuando la página llama a notFound(); es lo que hace que la
 * respuesta sea un 404 de verdad y no un 200 con cara de error.
 *
 * Componente de servidor a propósito. Se probó con "use client" para leer el
 * código desde la URL con usePathname() y repetirlo en el mensaje, pero así el
 * HTML llega vacío y la tarjeta aparece recién al hidratar. No recibe params
 * (not-found.tsx nunca los recibe), de modo que el mensaje es genérico: el
 * código que la persona escribió lo tiene igual en la barra de direcciones.
 */
export default function TrackCodeNotFound() {
  return <TrackNotFound />;
}
