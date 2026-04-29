import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Agrega GEMINI_API_KEY en el archivo .env.local (obtén tu clave gratis en aistudio.google.com)" },
      { status: 503 }
    );
  }

  const { text, title } = await request.json();

  if (!text || text.trim().length < 50) {
    return NextResponse.json(
      { error: "El texto es demasiado corto. Incluye el resumen y metodología de tu proyecto." },
      { status: 400 }
    );
  }

  const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genai.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Eres un experto en ética de la investigación en psicología, con experiencia en comités de ética de universidades latinoamericanas. Tu rol es ayudar a los investigadores a identificar aspectos éticos a fortalecer ANTES de enviar su proyecto al comité formal. Sé constructivo, específico y directo. Usa lenguaje claro. Responde en español.

Analiza el siguiente proyecto según los tres pilares éticos fundamentales:

**Título:** ${title || "Sin título"}

**Descripción / Metodología:**
${text}

Responde con este formato exacto:

## Pilar 1: Autonomía y Respeto por las Personas
**Estado:** [CUMPLE / CUMPLE PARCIALMENTE / NO ESPECIFICADO / REQUIERE ATENCIÓN]
**Aspectos positivos:** ...
**A mejorar:** ...
**Recomendación:** ...

## Pilar 2: Beneficencia y No Maleficencia
**Estado:** [CUMPLE / CUMPLE PARCIALMENTE / NO ESPECIFICADO / REQUIERE ATENCIÓN]
**Aspectos positivos:** ...
**A mejorar:** ...
**Recomendación:** ...

## Pilar 3: Justicia
**Estado:** [CUMPLE / CUMPLE PARCIALMENTE / NO ESPECIFICADO / REQUIERE ATENCIÓN]
**Aspectos positivos:** ...
**A mejorar:** ...
**Recomendación:** ...

## Conclusión
[2-3 oraciones sobre la preparación general del proyecto para ser enviado al Comité de Ética]`;

  const result = await model.generateContent(prompt);
  const review = result.response.text();

  return NextResponse.json({ review });
}
