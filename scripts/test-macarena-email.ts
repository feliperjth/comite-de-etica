/**
 * Prueba del correo de solicitud de certificado (el que recibe Macarena).
 * Lo envía SOLO a eticapsicologiauai@gmail.com con datos ficticios.
 *
 * Uso: npx tsx scripts/test-macarena-email.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";

// Cargar .env.local manualmente (fuera de Next.js no se carga solo)
for (const line of readFileSync(resolve(__dirname, "../.env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

import { buildMacarenaEmail, sendEmail, ETHICS_COMMITTEE_EMAIL } from "../src/lib/email";

async function main() {
  const project = {
    id: "00000000-0000-0000-0000-000000000000",
    title: "[PRUEBA] Bienestar psicológico en estudiantes universitarios",
    researcher_name: "Investigadora de Prueba",
    researcher_rut: "11.111.111-1",
    researcher_email: "investigador.prueba@example.com",
    researcher_role: "Estudiante de Magíster",
    advisor_name: "Profesora Guía de Prueba",
    funding_type: "fondecyt",
    funding_folio: "1234567",
  };

  const html = buildMacarenaEmail(project, "http://localhost:3000", "token-de-prueba", {
    hasConsent: true,
    hasAssent: false,
  });

  await sendEmail(
    ETHICS_COMMITTEE_EMAIL,
    `[PRUEBA] Solicitud certificado de ética · ${project.title}`,
    html,
  );

  console.log(`Correo de prueba enviado a ${ETHICS_COMMITTEE_EMAIL}`);
}

main().catch((err) => {
  console.error("Error al enviar:", err);
  process.exit(1);
});
