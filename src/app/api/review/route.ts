import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const PROMPTS = {
  seccion: (title: string, text: string, sectionLabel: string, criteria: string[]) => `
Eres un asesor de ética de la investigación que ayuda a investigadores universitarios en Chile a mejorar su protocolo ANTES de presentarlo al Comité de Ética.

El investigador quiere saber si el texto que escribió para la sección "${sectionLabel}" cumple con los criterios que usará el comité para evaluarla.

**Criterios de aceptación de esta sección:**
${criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}

**Título del proyecto:** ${title || "Sin título"}

**Texto del investigador para esta sección:**
${text}

Evalúa el texto anterior criterio por criterio. Sé específico, constructivo y breve. Habla directamente al investigador (usa "tu" / "debes").

Responde con este formato exacto:

${criteria.map((c) => `## Criterio: ${c}\n**Estado:** [CUMPLE / MEJORAR / FALTA]\n**Observación:** ...`).join("\n\n")}

## Recomendación principal
[1-2 oraciones con la acción más importante para mejorar esta sección antes de enviarla al comité]
`.trim(),

  investigador: (title: string, text: string) => `
Eres un asesor de ética de la investigación que apoya a investigadores universitarios en Chile a mejorar sus propuestas ANTES de presentarlas formalmente al Comité de Ética. El investigador quiere saber qué tan sólida es su documentación ética y qué debe reforzar o completar.

Tu análisis debe ser:
- Constructivo y orientado a la acción: "Incluye en el consentimiento...", "Especifica en el protocolo...", etc.
- Específico sobre qué información falta o es insuficiente
- Empático: el investigador quiere mejorar, no ser evaluado formalmente
- En español, lenguaje claro y directo

Analiza el siguiente proyecto según los tres pilares éticos e indica al investigador qué debe fortalecer:

**Título:** ${title || "Sin título"}

**Descripción / Resumen:**
${text}

Responde con este formato exacto:

## Pilar 1: Autonomía y Consentimiento Informado
**Estado de tu documentación:** [SÓLIDO / MEJORABLE / INCOMPLETO / NO ESPECIFICADO]
**Lo que tienes bien:** ...
**Qué debes reforzar:** ...
**Acción concreta:** ...

## Pilar 2: Beneficencia y Minimización de Riesgos
**Estado de tu documentación:** [SÓLIDO / MEJORABLE / INCOMPLETO / NO ESPECIFICADO]
**Lo que tienes bien:** ...
**Qué debes reforzar:** ...
**Acción concreta:** ...

## Pilar 3: Justicia y Equidad
**Estado de tu documentación:** [SÓLIDO / MEJORABLE / INCOMPLETO / NO ESPECIFICADO]
**Lo que tienes bien:** ...
**Qué debes reforzar:** ...
**Acción concreta:** ...

## Recomendación antes de enviar al comité
[2-3 oraciones sobre qué priorizar para fortalecer tu propuesta ética antes de la revisión formal]
`.trim(),

  revisor: (title: string, text: string) => `
Eres un experto en ética de la investigación en psicología, con experiencia en comités de ética de universidades latinoamericanas. Estás asistiendo a un REVISOR DEL COMITÉ DE ÉTICA a realizar su evaluación de manera sistemática y fundamentada.

Tu análisis debe ser:
- Técnico y formal (lenguaje de evaluación ética académica)
- Preciso sobre el nivel de cumplimiento de cada pilar según la información disponible
- Enfocado en identificar vacíos que requieren corrección formal por parte del investigador
- Señalar explícitamente si algún aspecto no puede evaluarse solo con el resumen disponible y requiere revisar los documentos adjuntos

Este análisis es una herramienta de apoyo al revisor, no un reemplazo de su juicio profesional. Responde en español.

Analiza el siguiente proyecto de investigación:

**Título:** ${title || "Sin título"}

**Descripción / Resumen:**
${text}

Responde con este formato exacto:

## Pilar 1: Autonomía y Respeto por las Personas
**Evaluación:** [CUMPLE / CUMPLE PARCIALMENTE / REQUIERE CORRECCIÓN / NO EVALUABLE SIN DOCUMENTOS]
**Aspectos satisfactorios:** ...
**Deficiencias identificadas:** ...
**Observación para el acta:** ...

## Pilar 2: Beneficencia y No Maleficencia
**Evaluación:** [CUMPLE / CUMPLE PARCIALMENTE / REQUIERE CORRECCIÓN / NO EVALUABLE SIN DOCUMENTOS]
**Aspectos satisfactorios:** ...
**Deficiencias identificadas:** ...
**Observación para el acta:** ...

## Pilar 3: Justicia
**Evaluación:** [CUMPLE / CUMPLE PARCIALMENTE / REQUIERE CORRECCIÓN / NO EVALUABLE SIN DOCUMENTOS]
**Aspectos satisfactorios:** ...
**Deficiencias identificadas:** ...
**Observación para el acta:** ...

## Dictamen preliminar
[2-3 oraciones sobre la preparación general del proyecto para aprobación ética, y si se recomienda aprobación directa, correcciones menores o correcciones sustantivas]
`.trim(),
};

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Agrega GEMINI_API_KEY en el archivo .env.local (obtén tu clave gratis en aistudio.google.com)" },
      { status: 503 }
    );
  }

  const { text, title, mode = "revisor", sectionLabel, criteria } = await request.json() as {
    text: string;
    title?: string;
    mode?: "investigador" | "revisor" | "seccion";
    sectionLabel?: string;
    criteria?: string[];
  };

  if (!text || text.trim().length < 20) {
    return NextResponse.json(
      { error: "El texto es demasiado corto para analizarlo." },
      { status: 400 }
    );
  }

  let prompt: string;
  if (mode === "seccion" && sectionLabel && criteria?.length) {
    prompt = PROMPTS.seccion(title ?? "", text, sectionLabel, criteria);
  } else {
    const promptFn = PROMPTS[mode as "investigador" | "revisor"] ?? PROMPTS.revisor;
    prompt = promptFn(title ?? "", text);
  }

  const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genai.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent(prompt);
  const review  = result.response.text();

  return NextResponse.json({ review });
}
