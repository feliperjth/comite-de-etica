import { Award } from "lucide-react";
import StatusBadge from "./StatusBadge";

/**
 * Estado final del proyecto: el badge de siempre y, cuando el certificado de
 * ética ya está disponible, un enlace para descargarlo.
 *
 * Se usa en todas las pantallas donde el comité ve proyectos, para que el
 * estado se lea igual en cualquiera de ellas. Antes el certificado solo era
 * visible para el investigador y en el seguimiento público, así que desde el
 * panel no había forma de saber si estaba emitido.
 */
export default function ProjectState({
  status,
  certificateUrl,
}: {
  status: string;
  certificateUrl?: string | null;
}) {
  return (
    <>
      <StatusBadge status={status} />
      {certificateUrl && (
        <a
          href={certificateUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Descargar el certificado de ética"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors"
        >
          <Award className="w-3 h-3" />
          Certificado
        </a>
      )}
    </>
  );
}
