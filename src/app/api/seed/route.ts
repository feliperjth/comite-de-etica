import { NextResponse } from "next/server";
import { getSupabase, getSupabaseAdmin } from "@/lib/supabase";

const themes = ["clinica","social","desarrollo","cognitiva","organizacional","educacional","forense","metodologia"];

function trackingCode() {
  return "CE-" + String(Math.floor(100000 + Math.random() * 900000));
}

const REVIEWERS = [
  { name: "Ana María Torres",       email: "amtorres@uai.cl",      expertise: ["clinica","social"] },
  { name: "Carlos Gutiérrez",       email: "cgutierrez@uai.cl",    expertise: ["cognitiva","metodologia"] },
  { name: "Valentina Reyes",        email: "vreyes@uai.cl",        expertise: ["desarrollo","educacional"] },
  { name: "Miguel Fuentes",         email: "mfuentes@uai.cl",      expertise: ["organizacional","social"] },
  { name: "Fernanda Soto",          email: "fsoto@uai.cl",         expertise: ["forense","clinica"] },
  { name: "Rodrigo Méndez",         email: "rmendez@uai.cl",       expertise: ["metodologia","cognitiva"] },
  { name: "Patricia Alvarado",      email: "palvarado@uai.cl",     expertise: ["educacional","desarrollo"] },
  { name: "Sebastián Castro",       email: "scastro@uai.cl",       expertise: ["social","organizacional"] },
  { name: "Camila Pizarro",         email: "cpizarro@uai.cl",      expertise: ["clinica","desarrollo"] },
  { name: "Diego Herrera",          email: "dherrera@uai.cl",      expertise: ["cognitiva","metodologia"] },
  { name: "Javiera Morales",        email: "jmorales@uai.cl",      expertise: ["social","forense"] },
  { name: "Andrés Espinoza",        email: "aespinoza@uai.cl",     expertise: ["organizacional","educacional"] },
  { name: "Daniela Riquelme",       email: "driquelme@uai.cl",     expertise: ["clinica","cognitiva"] },
  { name: "Felipe Navarro",         email: "fnavarro@uai.cl",      expertise: ["metodologia","social"] },
  { name: "Ignacia Vega",           email: "ivega@uai.cl",         expertise: ["forense","organizacional"] },
  { name: "Tomás Bravo",            email: "tbravo@uai.cl",        expertise: ["desarrollo","cognitiva"] },
  { name: "Sofía Contreras",        email: "scontreras@uai.cl",    expertise: ["educacional","clinica"] },
  { name: "Maximiliano Rojas",      email: "mrojas@uai.cl",        expertise: ["social","metodologia"] },
  { name: "Catalina Figueroa",      email: "cfigueroa@uai.cl",     expertise: ["organizacional","desarrollo"] },
  { name: "Nicolás Muñoz",          email: "nmunoz@uai.cl",        expertise: ["forense","cognitiva"] },
  { name: "Bárbara Pérez",          email: "bperez@uai.cl",        expertise: ["clinica","educacional"] },
  { name: "Cristóbal Salinas",      email: "csalinas@uai.cl",      expertise: ["social","desarrollo"] },
  { name: "Macarena Ibáñez",        email: "mibanez@uai.cl",       expertise: ["metodologia","forense"] },
  { name: "Alejandro Lara",         email: "alara@uai.cl",         expertise: ["cognitiva","organizacional"] },
  { name: "Francisca Vargas",       email: "fvargas@uai.cl",       expertise: ["desarrollo","clinica"] },
  { name: "Matías Flores",          email: "mflores@uai.cl",       expertise: ["educacional","social"] },
  { name: "Isidora Silva",          email: "isilva@uai.cl",        expertise: ["forense","metodologia"] },
  { name: "Juan Pablo Cortés",      email: "jpcortes@uai.cl",      expertise: ["organizacional","cognitiva"] },
  { name: "Constanza Medina",       email: "cmedina@uai.cl",       expertise: ["clinica","social","desarrollo"] },
  { name: "Emilio Sandoval",        email: "esandoval@uai.cl",     expertise: ["metodologia","educacional","forense"] },
];

const PROJECTS = [
  {
    title: "Efectividad de la terapia cognitivo-conductual en adolescentes con ansiedad social",
    researcher_name: "Laura Castillo Bravo",
    researcher_email: "lcastillo@investigador.cl",
    researcher_role: "doctorado",
    project_type: "tesis",
    theme: "clinica",
    abstract: "Este estudio evalúa la eficacia de un protocolo TCC de 12 sesiones en adolescentes entre 14 y 18 años diagnosticados con trastorno de ansiedad social. Se empleará un diseño cuasi-experimental con grupo control y seguimiento a 6 meses.",
    funding_type: "fondecyt",
    funding_folio: "11240123",
  },
  {
    title: "Identidad colectiva y bienestar en comunidades migrantes venezolanas en Santiago",
    researcher_name: "Roberto Paredes Leal",
    researcher_email: "rparedes@investigador.cl",
    researcher_role: "magister",
    project_type: "tesis",
    theme: "social",
    abstract: "Investigación cualitativa que explora los procesos de construcción identitaria en adultos migrantes venezolanos residentes en Santiago, y su relación con indicadores de bienestar psicosocial mediante entrevistas semiestructuradas.",
    funding_type: null,
    funding_folio: null,
  },
  {
    title: "Desarrollo de funciones ejecutivas en niños de 4 a 6 años: rol del juego simbólico",
    researcher_name: "Sofía Naranjo Pinto",
    researcher_email: "snaranjo@investigador.cl",
    researcher_role: "doctorado",
    project_type: "fondecyt",
    theme: "desarrollo",
    abstract: "Estudio longitudinal que examina la contribución del juego simbólico al desarrollo de funciones ejecutivas (inhibición, memoria de trabajo y flexibilidad cognitiva) en preescolares de 4 a 6 años en contextos de alta y baja vulnerabilidad socioeconómica.",
    funding_type: "fondecyt",
    funding_folio: "1230456",
  },
  {
    title: "Neurobiología del aprendizaje por refuerzo en adultos mayores: un estudio de fMRI",
    researcher_name: "Andrés Moreno Valdivia",
    researcher_email: "amoreno@investigador.cl",
    researcher_role: "investigador",
    project_type: "fondecyt",
    theme: "cognitiva",
    abstract: "Mediante resonancia magnética funcional se examinan los correlatos neuronales del aprendizaje por refuerzo en adultos mayores sanos (60-75 años), comparando sus patrones de activación con adultos jóvenes ante tareas de toma de decisiones bajo incertidumbre.",
    funding_type: "fondecyt",
    funding_folio: "1240789",
  },
  {
    title: "Liderazgo auténtico y compromiso organizacional en el sector salud público",
    researcher_name: "Carmen Ibarra Fuentes",
    researcher_email: "cibarra@investigador.cl",
    researcher_role: "magister",
    project_type: "tesis",
    theme: "organizacional",
    abstract: "Estudio cuantitativo que analiza la relación entre liderazgo auténtico de jefaturas directas y niveles de compromiso organizacional en profesionales de la salud de hospitales públicos de la Región Metropolitana.",
    funding_type: null,
    funding_folio: null,
  },
  {
    title: "Estrategias metacognitivas y rendimiento académico en estudiantes de primer año universitario",
    researcher_name: "Diego Tapia Guzmán",
    researcher_email: "dtapia@investigador.cl",
    researcher_role: "magister",
    project_type: "tesis",
    theme: "educacional",
    abstract: "Investigación mixta que evalúa el impacto de un programa de entrenamiento en estrategias metacognitivas sobre el rendimiento y la autorregulación académica de estudiantes de primer año en carreras del área de la salud.",
    funding_type: null,
    funding_folio: null,
  },
  {
    title: "Evaluación psicológica de la credibilidad del testimonio en víctimas de abuso sexual infantil",
    researcher_name: "Paula Espinoza Reyes",
    researcher_email: "pespinoza@investigador.cl",
    researcher_role: "doctorado",
    project_type: "fondecyt",
    theme: "forense",
    abstract: "Estudio que valida protocolos de evaluación de credibilidad testimonial (SVA-CBCA y NICHD) en niños entre 6 y 12 años víctimas de abuso sexual, considerando variables de edad, desarrollo cognitivo y características del abuso reportado.",
    funding_type: "fondecyt",
    funding_folio: "11230234",
  },
  {
    title: "Validación de la escala PERMA-Profiler en población universitaria chilena",
    researcher_name: "Gonzalo Herrera Campos",
    researcher_email: "gherrera@investigador.cl",
    researcher_role: "investigador",
    project_type: "tesis",
    theme: "metodologia",
    abstract: "Estudio psicométrico que examina las propiedades estructurales, de confiabilidad y validez de la escala PERMA-Profiler de bienestar psicológico en una muestra de 800 estudiantes universitarios de universidades chilenas.",
    funding_type: null,
    funding_folio: null,
  },
  {
    title: "Intervención mindfulness para reducción del burnout en profesores de educación básica",
    researcher_name: "Valentina Cruz Molina",
    researcher_email: "vcruz@investigador.cl",
    researcher_role: "magister",
    project_type: "tesis",
    theme: "clinica",
    abstract: "Ensayo clínico piloto que evalúa un programa MBSR adaptado de 8 semanas para reducir el síndrome de burnout en docentes de educación básica de establecimientos municipales, midiendo estrés percibido, agotamiento emocional y bienestar.",
    funding_type: null,
    funding_folio: null,
  },
  {
    title: "Cohesión social y salud mental en barrios con alta segregación urbana",
    researcher_name: "Marco Sepúlveda Araya",
    researcher_email: "msepulveda@investigador.cl",
    researcher_role: "doctorado",
    project_type: "fondecyt",
    theme: "social",
    abstract: "Estudio ecológico y multinivel que examina la asociación entre cohesión social comunitaria y prevalencia de trastornos mentales comunes en habitantes de barrios con distintos niveles de segregación residencial en tres ciudades chilenas.",
    funding_type: "fondecyt",
    funding_folio: "1230567",
  },
  {
    title: "Apego temprano y desarrollo socio-emocional en lactantes de familias en contexto de pobreza",
    researcher_name: "Javiera Muñoz Ortiz",
    researcher_email: "jmunoz@investigador.cl",
    researcher_role: "doctorado",
    project_type: "fondecyt",
    theme: "desarrollo",
    abstract: "Estudio prospectivo que evalúa la calidad del apego (Strange Situation) a los 12 meses y su relación con el desarrollo socioemocional a los 24 y 36 meses en lactantes de familias en situación de pobreza de la Región de Valparaíso.",
    funding_type: "fondecyt",
    funding_folio: "11240345",
  },
  {
    title: "Efectos del sueño sobre la consolidación de memoria emocional en adultos jóvenes",
    researcher_name: "Nicolás Ramos Fernández",
    researcher_email: "nramos@investigador.cl",
    researcher_role: "investigador",
    project_type: "fondecyt",
    theme: "cognitiva",
    abstract: "Diseño experimental de privación selectiva de sueño que examina el rol del sueño REM y NREM en la consolidación de memorias con contenido emocional negativo y neutro en adultos jóvenes sanos, mediante polisomniografía y tareas de reconocimiento.",
    funding_type: "fondecyt",
    funding_folio: "1240890",
  },
  {
    title: "Clima organizacional y rotación laboral en empresas del sector tecnológico",
    researcher_name: "Francisca Leiva Torres",
    researcher_email: "fleiva@investigador.cl",
    researcher_role: "magister",
    project_type: "tesis",
    theme: "organizacional",
    abstract: "Estudio correlacional que analiza dimensiones del clima organizacional como predictoras de la intención de rotación en trabajadores del sector tecnológico en Santiago, considerando el rol moderador de la satisfacción laboral y el apoyo organizacional percibido.",
    funding_type: null,
    funding_folio: null,
  },
  {
    title: "Programa de intervención para el desarrollo de habilidades socioemocionales en aula",
    researcher_name: "Cristina Vidal Saavedra",
    researcher_email: "cvidal@investigador.cl",
    researcher_role: "doctorado",
    project_type: "fondecyt",
    theme: "educacional",
    abstract: "Ensayo controlado aleatorizado que evalúa un programa SEL (Social-Emotional Learning) implementado por docentes en aulas de 3° y 4° básico, midiendo habilidades sociales, regulación emocional y convivencia escolar en 600 estudiantes de 12 escuelas.",
    funding_type: "fondecyt",
    funding_folio: "1230678",
  },
  {
    title: "Perfiles psicológicos de agresores sexuales reincidentes: estudio comparativo",
    researcher_name: "Rodrigo Cáceres Bello",
    researcher_email: "rcaceres@investigador.cl",
    researcher_role: "investigador",
    project_type: "fondecyt",
    theme: "forense",
    abstract: "Análisis comparativo de perfiles psicológicos mediante batería de evaluación forense (PCL-R, STATIC-99, HCR-20) en agresores sexuales reincidentes versus no reincidentes en el sistema penitenciario chileno, con foco en predictores de reincidencia.",
    funding_type: "fondecyt",
    funding_folio: "1240123",
  },
  {
    title: "Análisis de invarianza de medición del PHQ-9 según género y nivel educacional",
    researcher_name: "Isabel Mena Carrasco",
    researcher_email: "imena@investigador.cl",
    researcher_role: "investigador",
    project_type: "tesis",
    theme: "metodologia",
    abstract: "Estudio de validación que examina la invarianza de medición del cuestionario PHQ-9 de depresión entre hombres y mujeres y entre personas con distinto nivel educacional en una muestra representativa de adultos chilenos (n=1200) mediante SEM multigrupo.",
    funding_type: null,
    funding_folio: null,
  },
  {
    title: "Trauma complejo y disociación en mujeres sobrevivientes de violencia de pareja íntima",
    researcher_name: "Alejandra Poblete Vera",
    researcher_email: "apoblete@investigador.cl",
    researcher_role: "doctorado",
    project_type: "fondecyt",
    theme: "clinica",
    abstract: "Investigación clínica que examina la relación entre historia de trauma complejo, sintomatología disociativa y dificultades de regulación emocional en mujeres sobrevivientes de violencia de pareja, atendidas en centros de la Mujer del SERNAMEG.",
    funding_type: "fondecyt",
    funding_folio: "11240456",
  },
  {
    title: "Redes de apoyo social y recuperación tras desastres naturales en comunidades rurales",
    researcher_name: "Tomás Vergara Soto",
    researcher_email: "tvergara@investigador.cl",
    researcher_role: "investigador",
    project_type: "fondecyt",
    theme: "social",
    abstract: "Estudio longitudinal (18 meses) que examina la evolución de las redes de apoyo social informal y su relación con la recuperación psicosocial en comunidades rurales afectadas por incendios forestales en el Biobío y La Araucanía.",
    funding_type: "fondecyt",
    funding_folio: "1230789",
  },
  {
    title: "Regulación emocional y conducta prosocial en la adolescencia temprana",
    researcher_name: "Catalina Jara Figueroa",
    researcher_email: "cjara@investigador.cl",
    researcher_role: "magister",
    project_type: "tesis",
    theme: "desarrollo",
    abstract: "Estudio transversal que analiza el rol mediador de las estrategias de regulación emocional (reevaluación cognitiva, supresión) entre la empatía disposicional y la conducta prosocial en adolescentes de 12 a 15 años de establecimientos educacionales mixtos.",
    funding_type: null,
    funding_folio: null,
  },
  {
    title: "Sesgos atencionales hacia estímulos amenazantes en trastorno de estrés postraumático",
    researcher_name: "Bárbara Núñez Lagos",
    researcher_email: "bnunez@investigador.cl",
    researcher_role: "doctorado",
    project_type: "fondecyt",
    theme: "cognitiva",
    abstract: "Experimento de eye-tracking que compara sesgos atencionales (dot-probe y free-viewing) ante estímulos amenazantes versus neutros en adultos con PTSD, adultos con trauma sin PTSD y controles sanos, examinando el rol de la hipervigilancia en el mantenimiento del trastorno.",
    funding_type: "fondecyt",
    funding_folio: "11230567",
  },
  {
    title: "Teletrabajo, conciliación familia-trabajo y bienestar psicológico pospandemia",
    researcher_name: "Emilio Salas Contreras",
    researcher_email: "esalas@investigador.cl",
    researcher_role: "magister",
    project_type: "tesis",
    theme: "organizacional",
    abstract: "Investigación mixta que analiza el impacto del teletrabajo híbrido sobre el conflicto familia-trabajo, la satisfacción laboral y el bienestar psicológico en trabajadores con hijos menores de 12 años de empresas de servicios en Santiago.",
    funding_type: null,
    funding_folio: null,
  },
  {
    title: "Expectativas de autoeficacia docente y motivación de logro en estudiantes de pedagogía",
    researcher_name: "Marisol Ortega Cisternas",
    researcher_email: "mortega@investigador.cl",
    researcher_role: "investigador",
    project_type: "fondecyt",
    theme: "educacional",
    abstract: "Estudio que examina la relación entre la autoeficacia percibida de docentes en formación y la motivación de logro de sus estudiantes de práctica, utilizando modelamiento multinivel en datos de 80 estudiantes-docentes y sus 2.400 estudiantes.",
    funding_type: "fondecyt",
    funding_folio: "1240234",
  },
  {
    title: "Factores psicológicos protectores en jóvenes en conflicto con la ley en SENAME",
    researcher_name: "Ignacio Briones Sandoval",
    researcher_email: "ibriones@investigador.cl",
    researcher_role: "investigador",
    project_type: "fondecyt",
    theme: "forense",
    abstract: "Estudio de factores resilientes en adolescentes infractores de ley (14-18 años) institucionalizados en centros SENAME, identificando mediante análisis de redes los recursos personales, familiares y comunitarios asociados a menor reincidencia.",
    funding_type: "fondecyt",
    funding_folio: "1230890",
  },
  {
    title: "Equivalencia de medición en escalas de bienestar aplicadas online versus presencial",
    researcher_name: "Claudia Espejo Moreno",
    researcher_email: "cespejo@investigador.cl",
    researcher_role: "investigador",
    project_type: "tesis",
    theme: "metodologia",
    abstract: "Estudio de equivalencia de medición que compara las propiedades psicométricas del SWLS y la PANAS en modalidad de aplicación presencial versus online en muestras de adultos chilenos pareadas por edad, género y nivel educacional.",
    funding_type: null,
    funding_folio: null,
  },
  {
    title: "Terapia de aceptación y compromiso para dolor crónico en pacientes con fibromialgia",
    researcher_name: "Andrea Fuentes Molina",
    researcher_email: "afuentes@investigador.cl",
    researcher_role: "doctorado",
    project_type: "fondecyt",
    theme: "clinica",
    abstract: "Ensayo clínico aleatorizado que compara ACT (16 sesiones) versus tratamiento habitual (farmacológico) en pacientes con fibromialgia, evaluando dolor percibido, catastrofización, calidad de vida y flexibilidad psicológica a 3 y 12 meses post-tratamiento.",
    funding_type: "fondecyt",
    funding_folio: "11240678",
  },
  {
    title: "Representaciones sociales del estigma en personas con esquizofrenia y sus familias",
    researcher_name: "Sebastián Moya Robles",
    researcher_email: "smoya@investigador.cl",
    researcher_role: "investigador",
    project_type: "fondecyt",
    theme: "social",
    abstract: "Estudio fenomenológico-interpretativo de las representaciones sociales del estigma en personas diagnosticadas con esquizofrenia y sus familiares cuidadores, explorando sus efectos sobre la búsqueda de ayuda, adhesión al tratamiento e inclusión social.",
    funding_type: "fondecyt",
    funding_folio: "1240345",
  },
  {
    title: "Transición a la adultez emergente en jóvenes de primera generación universitaria",
    researcher_name: "Paola Henríquez Solis",
    researcher_email: "phenriquez@investigador.cl",
    researcher_role: "doctorado",
    project_type: "fondecyt",
    theme: "desarrollo",
    abstract: "Estudio longitudinal de 2 años que sigue a jóvenes de primera generación universitaria durante su ingreso a la educación superior, examinando identidad, metas de vida, bienestar y desafíos de la transición a la adultez emergente desde una perspectiva ecológica.",
    funding_type: "fondecyt",
    funding_folio: "11230789",
  },
  {
    title: "Correlatos cognitivos de la creatividad en adultos: un estudio de divergencia neuronal",
    researcher_name: "Felipe Arredondo Vargas",
    researcher_email: "farredondo@investigador.cl",
    researcher_role: "investigador",
    project_type: "fondecyt",
    theme: "cognitiva",
    abstract: "Estudio EEG de alta densidad que examina los correlatos electrofisiológicos del pensamiento divergente en adultos con alta y baja creatividad medida mediante tareas de usos alternativos y resolución de problemas de perspectiva remota.",
    funding_type: "fondecyt",
    funding_folio: "1240456",
  },
  {
    title: "Justicia organizacional y comportamientos contraproducentes en el trabajo en minería",
    researcher_name: "Rosa Aguilera Pérez",
    researcher_email: "raguilera@investigador.cl",
    researcher_role: "magister",
    project_type: "tesis",
    theme: "organizacional",
    abstract: "Estudio cuantitativo que analiza las percepciones de justicia distributiva, procedimental e interaccional como predictoras de comportamientos contraproducentes en trabajadores de faenas mineras del norte de Chile.",
    funding_type: null,
    funding_folio: null,
  },
  {
    title: "Efectos de la pandemia sobre el rendimiento lector en escolares de primero y segundo básico",
    researcher_name: "Luis Contreras Salvo",
    researcher_email: "lcontreras@investigador.cl",
    researcher_role: "investigador",
    project_type: "fondecyt",
    theme: "educacional",
    abstract: "Comparación de cohortes pre y pospandemia en indicadores de velocidad lectora, comprensión y conciencia fonológica en niños de 1° y 2° básico de escuelas municipales, examinando la brecha por modalidad de enseñanza (presencial, mixta, online) durante la pandemia.",
    funding_type: "fondecyt",
    funding_folio: "1230901",
  },
];

export async function POST() {
  const results = { reviewers: { ok: 0, errors: [] as string[] }, projects: { ok: 0, errors: [] as string[] } };

  // Insert reviewers — use admin client if service key available, else anon
  let reviewerClient;
  try {
    reviewerClient = getSupabaseAdmin();
  } catch {
    reviewerClient = getSupabase();
  }
  for (const r of REVIEWERS) {
    const { error } = await reviewerClient
      .from("reviewers")
      .upsert({ name: r.name, email: r.email, expertise: r.expertise }, { onConflict: "email" });
    if (error) results.reviewers.errors.push(`${r.name}: ${error.message}`);
    else results.reviewers.ok++;
  }

  // Insert projects using anon client (RLS allows public submit)
  const supabase = getSupabase();
  for (const p of PROJECTS) {
    const { error } = await supabase
      .from("projects")
      .insert({
        title: p.title,
        researcher_name: p.researcher_name,
        researcher_email: p.researcher_email,
        researcher_role: p.researcher_role,
        project_type: p.project_type,
        theme: p.theme,
        abstract: p.abstract,
        status: "submitted",
        progress: 10,
        tracking_code: trackingCode(),
        current_round: 1,
        advisor_name: null,
        funding_type: p.funding_type ?? null,
        funding_folio: p.funding_folio ?? null,
        funding_detail: null,
        researcher_rut: null,
        review_mode: null,
      });
    if (error) results.projects.errors.push(`${p.title.slice(0, 40)}: ${error.message}`);
    else results.projects.ok++;
  }

  return NextResponse.json(results);
}

export async function DELETE() {
  let adminClient;
  try {
    adminClient = getSupabaseAdmin();
  } catch {
    adminClient = getSupabase();
  }
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    adminClient.from("reviewers").delete().like("email", "%@uai.cl"),
    adminClient.from("projects").delete().like("researcher_email", "%@investigador.cl"),
  ]);
  return NextResponse.json({ deleted: true, errors: [e1?.message, e2?.message].filter(Boolean) });
}
