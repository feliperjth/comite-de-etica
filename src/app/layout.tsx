import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Comité de Ética | Escuela de Psicología UAI",
  description:
    "Portal oficial para el envío y seguimiento de proyectos de investigación ante el Comité de Ética de la Escuela de Psicología, Universidad Adolfo Ibáñez.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="bg-uai-navy-dark text-slate-400 text-sm py-6 text-center">
          © 2025 Comité de Ética · Escuela de Psicología · Universidad Adolfo Ibáñez
        </footer>
      </body>
    </html>
  );
}
