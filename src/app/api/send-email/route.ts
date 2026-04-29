import { NextResponse } from "next/server";
import { sendEmail, buildSubmittedEmail } from "@/lib/email";

export async function POST(req: Request) {
  const { to, projectTitle, trackingCode, origin, researcherName } = await req.json();

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return NextResponse.json({ ok: false, error: "Email no configurado" });
  }

  try {
    await sendEmail(
      to,
      `Proyecto recibido · ${trackingCode} · Comité de Ética UAI`,
      buildSubmittedEmail(
        { title: projectTitle, researcher_name: researcherName ?? to, tracking_code: trackingCode },
        origin,
      ),
    );
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("Email error:", e);
    return NextResponse.json({ ok: false, error: String(e) });
  }
}
