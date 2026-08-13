import { FileSearch } from "lucide-react";
import Link from "next/link";

/**
 * Pantalla de "código no encontrado" del seguimiento.
 *
 * Vive fuera de la página porque la usan dos lugares: el not-found.tsx del
 * segmento (que es quien produce el 404 real) y la propia página cuando la
 * base de datos no está configurada, que no es un 404 sino otra cosa.
 *
 * Sin `code` el mensaje es genérico: not-found.tsx no recibe params y se
 * prefirió renderizar en el servidor antes que repetir el código.
 */
export default function TrackNotFound({ code, message }: { code?: string; message?: string }) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <FileSearch className="w-8 h-8 text-slate-300" />
        </div>
        <h1 className="text-xl font-bold text-[#1A1A1A] mb-2">Código no encontrado</h1>
        <p className="text-slate-400 text-sm mb-8">
          {message ?? (code
            ? `No existe ningún proyecto con el código "${code.toUpperCase()}".`
            : "No existe ningún proyecto con ese código. Revisa que esté completo: son seis caracteres después de CE-.")}
        </p>
        <Link href="/" className="bg-[#1A1A1A] text-white font-semibold px-6 py-3 rounded-xl text-sm hover:bg-black transition-colors inline-block">
          Ir al portal
        </Link>
      </div>
    </div>
  );
}
