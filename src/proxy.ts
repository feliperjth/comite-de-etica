import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Reviewer dashboard — require session
  if (path.startsWith("/revisores/dashboard") || path.startsWith("/revisores/review")) {
    const session = request.cookies.get("reviewer_session")?.value;
    const token   = process.env.REVIEWER_SESSION_TOKEN;
    if (session !== token) {
      return NextResponse.redirect(new URL("/revisores", request.url));
    }
  }

  // Investigador login page — skip if already logged in
  if (path === "/investigador") {
    const email = request.cookies.get("investigador_email")?.value;
    if (email) {
      return NextResponse.redirect(new URL("/investigador/perfil", request.url));
    }
  }

  // Investigador profile — require session
  if (path.startsWith("/investigador/perfil")) {
    const email = request.cookies.get("investigador_email")?.value;
    if (!email) {
      return NextResponse.redirect(new URL("/investigador", request.url));
    }
  }

  // Comité login page — skip if already logged in
  if (path === "/comite") {
    const email = request.cookies.get("comite_email")?.value;
    if (email) {
      return NextResponse.redirect(new URL("/comite/perfil", request.url));
    }
  }

  // Comité profile — require session
  if (path.startsWith("/comite/perfil")) {
    const email = request.cookies.get("comite_email")?.value;
    if (!email) {
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
