import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

/**
 * Protección de páginas. La autorización real de los datos vive en cada
 * route handler de /api (ver src/lib/auth.ts): esto solo evita que se
 * muestren pantallas a quien no ha iniciado sesión.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  const isStaff =
    session?.role === "revisor" || session?.role === "comite" || session?.role === "admin";

  // Reviewer dashboard — require session
  if (path.startsWith("/revisores/dashboard") || path.startsWith("/revisores/review")) {
    if (!isStaff) {
      return NextResponse.redirect(new URL("/revisores", request.url));
    }
  }

  // Investigador login page — skip if already logged in
  if (path === "/investigador") {
    if (session?.role === "investigador") {
      return NextResponse.redirect(new URL("/investigador/perfil", request.url));
    }
  }

  // Investigador profile — require session
  if (path.startsWith("/investigador/perfil")) {
    if (session?.role !== "investigador") {
      return NextResponse.redirect(new URL("/investigador", request.url));
    }
  }

  // Comité login page — skip if already logged in
  if (path === "/comite") {
    if (isStaff) {
      return NextResponse.redirect(new URL("/comite/perfil", request.url));
    }
  }

  // Comité profile — require session
  if (path.startsWith("/comite/perfil")) {
    if (!isStaff) {
      return NextResponse.redirect(new URL("/comite", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/revisores/dashboard/:path*",
    "/revisores/review/:path*",
    "/investigador",
    "/investigador/perfil/:path*",
    "/comite",
    "/comite/perfil/:path*",
  ],
};
