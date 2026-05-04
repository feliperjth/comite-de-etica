import { NextResponse } from "next/server";
import { getSupabase, getSupabaseAdmin } from "@/lib/supabase";

function trackingCode() {
  return "CE-" + String(Math.floor(100000 + Math.random() * 900000));
}

const REVIEWERS = [
  { name: "Ana María Torres",         email: "amtorres@uai.cl",      expertise: ["clinica","social"] },
  { name: "Carlos Gutiérrez",         email: "cgutierrez@uai.cl",    expertise: ["cognitiva","metodologia"] },
  { name: "Valentina Reyes",          email: "vreyes@uai.cl",        expertise: ["desarrollo","educacional"] },
  { name: "Miguel Fuentes",           email: "mfuentes@uai.cl",      expertise: ["organizacional","social"] },
  { name: "Fernanda Soto",            email: "fsoto@uai.cl",         expertise: ["forense","clinica"] },
  { name: "Rodrigo Méndez",           email: "rmendez@uai.cl",       expertise: ["metodologia","cognitiva"] },
  { name: "Patricia Alvarado",        email: "palvarado@uai.cl",     expertise: ["educacional","desarrollo"] },
  { name: "Sebastián Castro",         email: "scastro@uai.cl",       expertise: ["social","organizacional"] },
  { name: "Camila Pizarro",           email: "cpizarro@uai.cl",      expertise: ["clinica","desarrollo"] },
  { name: "Diego Herrera",            email: "dherrera@uai.cl",      expertise: ["cognitiva","metodologia"] },
  { name: "Javiera Morales",          email: "jmorales@uai.cl",      expertise: ["social","forense"] },
  { name: "Andrés Espinoza",          email: "aespinoza@uai.cl",     expertise: ["organizacional","educacional"] },
  { name: "Daniela Riquelme",         email: "driquelme@uai.cl",     expertise: ["clinica","cognitiva"] },
  { name: "Felipe Navarro",           email: "fnavarro@uai.cl",      expertise: ["metodologia","social"] },
  { name: "Ignacia Vega",             email: "ivega@uai.cl",         expertise: ["forense","organizacional"] },
  { name: "Tomás Bravo",              email: "tbravo@uai.cl",        expertise: ["desarrollo","cognitiva"] },
  { name: "Sofía Contreras",          email: "scontreras@uai.cl",    expertise: ["educacional","clinica"] },
  { name: "Maximiliano Rojas",        email: "mrojas@uai.cl",        expertise: ["social","metodologia"] },
  { name: "Catalina Figueroa",        email: "cfigueroa@uai.cl",     expertise: ["organizacional","desarrollo"] },
  { name: "Nicolás Muñoz",            email: "nmunoz@uai.cl",        expertise: ["forense","cognitiva"] },
  { name: "Bárbara Pérez",            email: "bperez@uai.cl",        expertise: ["clinica","educacional"] },
  { name: "Cristóbal Salinas",        email: "csalinas@uai.cl",      expertise: ["social","desarrollo"] },
  { name: "Macarena Ibáñez",          email: "mibanez@uai.cl",       expertise: ["metodologia","forense"] },
  { name: "Alejandro Lara",           email: "alara@uai.cl",         expertise: ["cognitiva","organizacional"] },
  { name: "Francisca Vargas",         email: "fvargas@uai.cl",       expertise: ["desarrollo","clinica"] },
  { name: "Matías Flores",            email: "mflores@uai.cl",       expertise: ["educacional","social"] },
  { name: "Isidora Silva",            email: "isilva@uai.cl",        expertise: ["forense","metodologia"] },
  { name: "Juan Pablo Cortés",        email: "jpcortes@uai.cl",      expertise: ["organizacional","cognitiva"] },
  { name: "Constanza Medina",         email: "cmedina@uai.cl",       expertise: ["clinica","social","desarrollo"] },
  { name: "Emilio Sandoval",          email: "esandoval@uai.cl",     expertise: ["metodologia","educacional","forense"] },
  // Nuevos revisores
  { name: "Isabel Guzmán Rojas",      email: "iguzman@uai.cl",       expertise: ["clinica","forense"] },
  { name: "Patricio Molina Vera",     email: "pmolina@uai.cl",       expertise: ["social","educacional"] },
  { name: "Renata Espinoza Koch",     email: "reskoch@uai.cl",       expertise: ["cognitiva","desarrollo"] },
  { name: "Héctor Díaz Fuentes",      email: "hdiaz@uai.cl",         expertise: ["metodologia","organizacional"] },
  { name: "Lorena Cabrera Sepúlveda", email: "lcabrera@uai.cl",      expertise: ["forense","social"] },
  { name: "Gabriel Moreno Cifuentes", email: "gmoreno@uai.cl",       expertise: ["educacional","clinica"] },
  { name: "Andrea Jiménez Romero",    email: "ajimenez@uai.cl",      expertise: ["desarrollo","metodologia"] },
  { name: "Gonzalo Álvarez Gana",     email: "galvarez@uai.cl",      expertise: ["organizacional","cognitiva"] },
  { name: "Beatriz Tapia Aguilar",    email: "btapia@uai.cl",        expertise: ["clinica","social"] },
  { name: "Rodrigo Fuenzalida Vera",  email: "rfuenzalida@uai.cl",   expertise: ["cognitiva","forense","metodologia"] },
];

const PROJECTS = [
  // ── Proyectos existentes ──────────────────────────────────────────────────
  {
    title: "Efectividad de la terapia cognitivo-conductual en adolescentes con ansiedad social",
    researcher_name: "Laura Castillo Bravo",
    researcher_email: "lcastillo@investigador.cl",
    project_type: "doctorado", theme: "clinica",
    abstract: "Este estudio evalúa la eficacia de un protocolo TCC de 12 sesiones en adolescentes entre 14 y 18 años diagnosticados con trastorno de ansiedad social.",
    funding_type: "fondecyt", funding_folio: "11240123",
  },
  {
    title: "Identidad colectiva y bienestar en comunidades migrantes venezolanas en Santiago",
    researcher_name: "Roberto Paredes Leal",
    researcher_email: "rparedes@investigador.cl",
    project_type: "magister", theme: "social",
    abstract: "Investigación cualitativa que explora los procesos de construcción identitaria en adultos migrantes venezolanos residentes en Santiago.",
    funding_type: null, funding_folio: null,
  },
  {
    title: "Desarrollo de funciones ejecutivas en niños de 4 a 6 años: rol del juego simbólico",
    researcher_name: "Sofía Naranjo Pinto",
    researcher_email: "snaranjo@investigador.cl",
    project_type: "doctorado", theme: "desarrollo",
    abstract: "Estudio longitudinal que examina la contribución del juego simbólico al desarrollo de funciones ejecutivas en preescolares de 4 a 6 años.",
    funding_type: "fondecyt", funding_folio: "1230456",
  },
  {
    title: "Neurobiología del aprendizaje por refuerzo en adultos mayores: un estudio de fMRI",
    researcher_name: "Andrés Moreno Valdivia",
    researcher_email: "amoreno@investigador.cl",
    project_type: "fondecyt", theme: "cognitiva",
    abstract: "Mediante resonancia magnética funcional se examinan los correlatos neuronales del aprendizaje por refuerzo en adultos mayores sanos.",
    funding_type: "fondecyt", funding_folio: "1240789",
  },
  {
    title: "Liderazgo auténtico y compromiso organizacional en el sector salud público",
    researcher_name: "Carmen Ibarra Fuentes",
    researcher_email: "cibarra@investigador.cl",
    project_type: "magister", theme: "organizacional",
    abstract: "Estudio cuantitativo que analiza la relación entre liderazgo auténtico y niveles de compromiso organizacional en profesionales de la salud.",
    funding_type: null, funding_folio: null,
  },
  {
    title: "Estrategias metacognitivas y rendimiento académico en estudiantes de primer año universitario",
    researcher_name: "Diego Tapia Guzmán",
    researcher_email: "dtapia@investigador.cl",
    project_type: "magister", theme: "educacional",
    abstract: "Investigación mixta que evalúa el impacto de un programa de entrenamiento en estrategias metacognitivas sobre el rendimiento académico.",
    funding_type: null, funding_folio: null,
  },
  {
    title: "Evaluación psicológica de la credibilidad del testimonio en víctimas de abuso sexual infantil",
    researcher_name: "Paula Espinoza Reyes",
    researcher_email: "pespinoza@investigador.cl",
    project_type: "doctorado", theme: "forense",
    abstract: "Estudio que valida protocolos de evaluación de credibilidad testimonial en niños entre 6 y 12 años víctimas de abuso sexual.",
    funding_type: "fondecyt", funding_folio: "11230234",
  },
  {
    title: "Validación de la escala PERMA-Profiler en población universitaria chilena",
    researcher_name: "Gonzalo Herrera Campos",
    researcher_email: "gherrera@investigador.cl",
    project_type: "docente", theme: "metodologia",
    abstract: "Estudio psicométrico que examina las propiedades estructurales de la escala PERMA-Profiler en 800 estudiantes universitarios chilenos.",
    funding_type: null, funding_folio: null,
  },
  {
    title: "Intervención mindfulness para reducción del burnout en profesores de educación básica",
    researcher_name: "Valentina Cruz Molina",
    researcher_email: "vcruz@investigador.cl",
    project_type: "magister", theme: "clinica",
    abstract: "Ensayo clínico piloto que evalúa un programa MBSR de 8 semanas para reducir el síndrome de burnout en docentes de educación básica.",
    funding_type: null, funding_folio: null,
  },
  {
    title: "Cohesión social y salud mental en barrios con alta segregación urbana",
    researcher_name: "Marco Sepúlveda Araya",
    researcher_email: "msepulveda@investigador.cl",
    project_type: "doctorado", theme: "social",
    abstract: "Estudio ecológico y multinivel que examina la asociación entre cohesión social comunitaria y prevalencia de trastornos mentales comunes.",
    funding_type: "fondecyt", funding_folio: "1230567",
  },
  {
    title: "Apego temprano y desarrollo socio-emocional en lactantes de familias en contexto de pobreza",
    researcher_name: "Javiera Muñoz Ortiz",
    researcher_email: "jmunoz@investigador.cl",
    project_type: "doctorado", theme: "desarrollo",
    abstract: "Estudio prospectivo que evalúa la calidad del apego a los 12 meses y su relación con el desarrollo socioemocional a los 24 y 36 meses.",
    funding_type: "fondecyt", funding_folio: "11240345",
  },
  {
    title: "Efectos del sueño sobre la consolidación de memoria emocional en adultos jóvenes",
    researcher_name: "Nicolás Ramos Fernández",
    researcher_email: "nramos@investigador.cl",
    project_type: "docente", theme: "cognitiva",
    abstract: "Diseño experimental que examina el rol del sueño REM y NREM en la consolidación de memorias con contenido emocional negativo.",
    funding_type: "fondecyt", funding_folio: "1240890",
  },
  {
    title: "Clima organizacional y rotación laboral en empresas del sector tecnológico",
    researcher_name: "Francisca Leiva Torres",
    researcher_email: "fleiva@investigador.cl",
    project_type: "magister", theme: "organizacional",
    abstract: "Estudio correlacional que analiza dimensiones del clima organizacional como predictoras de la intención de rotación en trabajadores del sector tecnológico.",
    funding_type: null, funding_folio: null,
  },
  {
    title: "Programa de intervención para el desarrollo de habilidades socioemocionales en aula",
    researcher_name: "Cristina Vidal Saavedra",
    researcher_email: "cvidal@investigador.cl",
    project_type: "doctorado", theme: "educacional",
    abstract: "Ensayo controlado aleatorizado que evalúa un programa SEL implementado por docentes en aulas de 3° y 4° básico.",
    funding_type: "fondecyt", funding_folio: "1230678",
  },
  {
    title: "Perfiles psicológicos de agresores sexuales reincidentes: estudio comparativo",
    researcher_name: "Rodrigo Cáceres Bello",
    researcher_email: "rcaceres@investigador.cl",
    project_type: "docente", theme: "forense",
    abstract: "Análisis comparativo de perfiles psicológicos en agresores sexuales reincidentes versus no reincidentes en el sistema penitenciario chileno.",
    funding_type: "fondecyt", funding_folio: "1240123",
  },
  {
    title: "Análisis de invarianza de medición del PHQ-9 según género y nivel educacional",
    researcher_name: "Isabel Mena Carrasco",
    researcher_email: "imena@investigador.cl",
    project_type: "docente", theme: "metodologia",
    abstract: "Estudio de validación que examina la invarianza de medición del cuestionario PHQ-9 de depresión entre distintos grupos sociodemográficos.",
    funding_type: null, funding_folio: null,
  },
  {
    title: "Trauma complejo y disociación en mujeres sobrevivientes de violencia de pareja íntima",
    researcher_name: "Alejandra Poblete Vera",
    researcher_email: "apoblete@investigador.cl",
    project_type: "doctorado", theme: "clinica",
    abstract: "Investigación clínica que examina la relación entre historia de trauma complejo, sintomatología disociativa y dificultades de regulación emocional.",
    funding_type: "fondecyt", funding_folio: "11240456",
  },
  {
    title: "Redes de apoyo social y recuperación tras desastres naturales en comunidades rurales",
    researcher_name: "Tomás Vergara Soto",
    researcher_email: "tvergara@investigador.cl",
    project_type: "docente", theme: "social",
    abstract: "Estudio longitudinal que examina la evolución de las redes de apoyo social informal y su relación con la recuperación psicosocial.",
    funding_type: "fondecyt", funding_folio: "1230789",
  },
  {
    title: "Regulación emocional y conducta prosocial en la adolescencia temprana",
    researcher_name: "Catalina Jara Figueroa",
    researcher_email: "cjara@investigador.cl",
    project_type: "magister", theme: "desarrollo",
    abstract: "Estudio transversal que analiza el rol mediador de las estrategias de regulación emocional entre la empatía y la conducta prosocial en adolescentes.",
    funding_type: null, funding_folio: null,
  },
  {
    title: "Sesgos atencionales hacia estímulos amenazantes en trastorno de estrés postraumático",
    researcher_name: "Bárbara Núñez Lagos",
    researcher_email: "bnunez@investigador.cl",
    project_type: "doctorado", theme: "cognitiva",
    abstract: "Experimento de eye-tracking que compara sesgos atencionales ante estímulos amenazantes en adultos con PTSD versus controles sanos.",
    funding_type: "fondecyt", funding_folio: "11230567",
  },
  {
    title: "Teletrabajo, conciliación familia-trabajo y bienestar psicológico pospandemia",
    researcher_name: "Emilio Salas Contreras",
    researcher_email: "esalas@investigador.cl",
    project_type: "magister", theme: "organizacional",
    abstract: "Investigación mixta que analiza el impacto del teletrabajo híbrido sobre el conflicto familia-trabajo y el bienestar psicológico.",
    funding_type: null, funding_folio: null,
  },
  {
    title: "Expectativas de autoeficacia docente y motivación de logro en estudiantes de pedagogía",
    researcher_name: "Marisol Ortega Cisternas",
    researcher_email: "mortega@investigador.cl",
    project_type: "docente", theme: "educacional",
    abstract: "Estudio que examina la relación entre la autoeficacia percibida de docentes en formación y la motivación de logro de sus estudiantes.",
    funding_type: "fondecyt", funding_folio: "1240234",
  },
  {
    title: "Factores psicológicos protectores en jóvenes en conflicto con la ley en SENAME",
    researcher_name: "Ignacio Briones Sandoval",
    researcher_email: "ibriones@investigador.cl",
    project_type: "docente", theme: "forense",
    abstract: "Estudio de factores resilientes en adolescentes infractores de ley institucionalizados en centros SENAME.",
    funding_type: "fondecyt", funding_folio: "1230890",
  },
  {
    title: "Equivalencia de medición en escalas de bienestar aplicadas online versus presencial",
    researcher_name: "Claudia Espejo Moreno",
    researcher_email: "cespejo@investigador.cl",
    project_type: "docente", theme: "metodologia",
    abstract: "Estudio de equivalencia que compara propiedades psicométricas del SWLS y la PANAS en modalidades presencial versus online.",
    funding_type: null, funding_folio: null,
  },
  {
    title: "Terapia de aceptación y compromiso para dolor crónico en pacientes con fibromialgia",
    researcher_name: "Andrea Fuentes Molina",
    researcher_email: "afuentes@investigador.cl",
    project_type: "doctorado", theme: "clinica",
    abstract: "Ensayo clínico aleatorizado que compara ACT versus tratamiento habitual en pacientes con fibromialgia.",
    funding_type: "fondecyt", funding_folio: "11240678",
  },
  {
    title: "Representaciones sociales del estigma en personas con esquizofrenia y sus familias",
    researcher_name: "Sebastián Moya Robles",
    researcher_email: "smoya@investigador.cl",
    project_type: "docente", theme: "social",
    abstract: "Estudio fenomenológico-interpretativo de las representaciones sociales del estigma en personas diagnosticadas con esquizofrenia.",
    funding_type: "fondecyt", funding_folio: "1240345",
  },
  {
    title: "Transición a la adultez emergente en jóvenes de primera generación universitaria",
    researcher_name: "Paola Henríquez Solis",
    researcher_email: "phenriquez@investigador.cl",
    project_type: "doctorado", theme: "desarrollo",
    abstract: "Estudio longitudinal de 2 años que sigue a jóvenes de primera generación universitaria durante su ingreso a la educación superior.",
    funding_type: "fondecyt", funding_folio: "11230789",
  },
  {
    title: "Correlatos cognitivos de la creatividad en adultos: un estudio de divergencia neuronal",
    researcher_name: "Felipe Arredondo Vargas",
    researcher_email: "farredondo@investigador.cl",
    project_type: "docente", theme: "cognitiva",
    abstract: "Estudio EEG de alta densidad que examina los correlatos electrofisiológicos del pensamiento divergente en adultos con alta y baja creatividad.",
    funding_type: "fondecyt", funding_folio: "1240456",
  },
  {
    title: "Justicia organizacional y comportamientos contraproducentes en el trabajo en minería",
    researcher_name: "Rosa Aguilera Pérez",
    researcher_email: "raguilera@investigador.cl",
    project_type: "magister", theme: "organizacional",
    abstract: "Estudio cuantitativo que analiza las percepciones de justicia como predictoras de comportamientos contraproducentes en trabajadores mineros.",
    funding_type: null, funding_folio: null,
  },
  {
    title: "Efectos de la pandemia sobre el rendimiento lector en escolares de primero y segundo básico",
    researcher_name: "Luis Contreras Salvo",
    researcher_email: "lcontreras@investigador.cl",
    project_type: "docente", theme: "educacional",
    abstract: "Comparación de cohortes pre y pospandemia en indicadores de velocidad lectora y comprensión en niños de 1° y 2° básico.",
    funding_type: "fondecyt", funding_folio: "1230901",
  },

  // ── Nuevos proyectos de pregrado ──────────────────────────────────────────
  {
    title: "Relación entre uso de redes sociales y autoestima en adolescentes de 15 a 18 años",
    researcher_name: "Camila Reyes Soto",
    researcher_email: "creyes@investigador.cl",
    project_type: "pregrado", theme: "social",
    abstract: "Estudio correlacional que examina la asociación entre frecuencia de uso de Instagram y TikTok, comparación social y niveles de autoestima en adolescentes chilenos.",
    funding_type: null, funding_folio: null,
  },
  {
    title: "Ansiedad ante los exámenes y estrategias de afrontamiento en universitarios de primer año",
    researcher_name: "Matías González Ríos",
    researcher_email: "mgonzalez@investigador.cl",
    project_type: "pregrado", theme: "educacional",
    abstract: "Investigación cuantitativa que evalúa los niveles de ansiedad ante evaluaciones y las estrategias de afrontamiento en alumnos de primer año de psicología.",
    funding_type: null, funding_folio: null,
  },
  {
    title: "Percepción de discriminación y bienestar subjetivo en estudiantes LGBTQ+ universitarios",
    researcher_name: "Isidora Pino Vega",
    researcher_email: "ipino@investigador.cl",
    project_type: "pregrado", theme: "social",
    abstract: "Estudio que examina la relación entre experiencias de discriminación percibida y niveles de bienestar subjetivo en jóvenes LGBTQ+ en contextos universitarios.",
    funding_type: null, funding_folio: null,
  },
  {
    title: "Perfeccionismo, procrastinación y rendimiento académico en estudiantes de psicología",
    researcher_name: "Sebastián Araya Mora",
    researcher_email: "saraya@investigador.cl",
    project_type: "pregrado", theme: "educacional",
    abstract: "Investigación que analiza el rol del perfeccionismo adaptativo y desadaptativo en la procrastinación y el rendimiento académico en estudiantes universitarios.",
    funding_type: null, funding_folio: null,
  },
  {
    title: "Hábitos de sueño, fatiga cognitiva y funcionamiento ejecutivo en adultos jóvenes",
    researcher_name: "Valentina Ramos Fuentes",
    researcher_email: "vramos@investigador.cl",
    project_type: "pregrado", theme: "cognitiva",
    abstract: "Estudio transversal que evalúa la relación entre higiene del sueño, fatiga cognitiva subjetiva y rendimiento en pruebas de funciones ejecutivas en universitarios.",
    funding_type: null, funding_folio: null,
  },
  {
    title: "Apego a mascotas y soledad percibida en adultos mayores que viven solos",
    researcher_name: "Francisca Núñez Bravo",
    researcher_email: "fnunez@investigador.cl",
    project_type: "pregrado", theme: "clinica",
    abstract: "Investigación exploratoria sobre el vínculo afectivo con mascotas como factor protector ante la soledad subjetiva en adultos mayores de 65 años que viven solos.",
    funding_type: null, funding_folio: null,
  },
  {
    title: "Creencias irracionales y satisfacción en la relación de pareja en adultos jóvenes",
    researcher_name: "Diego Saavedra Ortiz",
    researcher_email: "dsaavedra@investigador.cl",
    project_type: "pregrado", theme: "clinica",
    abstract: "Estudio que examina la relación entre creencias irracionales sobre las relaciones románticas (escala IRRB) y la satisfacción de pareja en adultos entre 18 y 35 años.",
    funding_type: null, funding_folio: null,
  },
  {
    title: "Eficacia de técnicas de relajación en la reducción del estrés académico",
    researcher_name: "Constanza Pérez Lagos",
    researcher_email: "cperez@investigador.cl",
    project_type: "pregrado", theme: "clinica",
    abstract: "Ensayo piloto que compara la efectividad de relajación muscular progresiva versus respiración diafragmática en la reducción del estrés académico percibido.",
    funding_type: null, funding_folio: null,
  },

  // ── Nuevos proyectos de magíster ──────────────────────────────────────────
  {
    title: "Intervención psicoeducativa grupal para padres de niños con TEA en etapa escolar",
    researcher_name: "Lorena Castañeda Rivas",
    researcher_email: "lcastaneda@investigador.cl",
    project_type: "magister", theme: "clinica",
    abstract: "Evaluación de un programa psicoeducativo grupal de 10 sesiones para padres de niños con TEA en edad escolar, midiendo estrés parental y estrategias de crianza.",
    funding_type: null, funding_folio: null,
  },
  {
    title: "Cultura organizacional y síndrome de burnout en trabajadores de ONGs",
    researcher_name: "Alejandro Vera Tapia",
    researcher_email: "avera@investigador.cl",
    project_type: "magister", theme: "organizacional",
    abstract: "Investigación mixta que examina el papel de la cultura organizacional como moderadora entre demandas laborales y burnout en trabajadores del tercer sector.",
    funding_type: null, funding_folio: null,
  },
  {
    title: "Representaciones de género y toma de decisiones vocacionales en adolescentes de enseñanza media",
    researcher_name: "Daniela Figueroa Mena",
    researcher_email: "dfigueroa@investigador.cl",
    project_type: "magister", theme: "educacional",
    abstract: "Estudio cualitativo que analiza cómo las representaciones de género mediatizan las decisiones vocacionales en estudiantes de 3° y 4° medio de colegios mixtos.",
    funding_type: null, funding_folio: null,
  },
  {
    title: "Mindfulness y regulación emocional en adultos con diagnóstico de trastorno límite",
    researcher_name: "Nicolás Caro Vidal",
    researcher_email: "ncaro@investigador.cl",
    project_type: "magister", theme: "clinica",
    abstract: "Investigación cuantitativa que evalúa la efectividad de un módulo de mindfulness de 8 semanas en la regulación emocional de adultos con TLP en tratamiento ambulatorio.",
    funding_type: null, funding_folio: null,
  },
  {
    title: "Actitudes hacia la vejez y calidad de vida percibida en adultos mayores institucionalizados",
    researcher_name: "Pamela Rojas Herrera",
    researcher_email: "projas@investigador.cl",
    project_type: "magister", theme: "social",
    abstract: "Estudio correlacional que examina cómo las actitudes hacia el envejecimiento propio y social se relacionan con la calidad de vida percibida en adultos mayores residentes.",
    funding_type: null, funding_folio: null,
  },
];

// Researcher accounts para los proyectos seed
const RESEARCHER_ACCOUNTS = PROJECTS.map(p => ({
  name: p.researcher_name,
  email: p.researcher_email,
  password: "test2026",
}));

export async function POST() {
  const results = {
    reviewers:   { ok: 0, errors: [] as string[] },
    projects:    { ok: 0, errors: [] as string[] },
    researchers: { ok: 0, errors: [] as string[] },
  };

  let adminClient;
  try { adminClient = getSupabaseAdmin(); } catch { adminClient = getSupabase(); }

  // Reviewers
  for (const r of REVIEWERS) {
    const { error } = await adminClient
      .from("reviewers")
      .upsert({ name: r.name, email: r.email, expertise: r.expertise }, { onConflict: "email" });
    if (error) results.reviewers.errors.push(`${r.name}: ${error.message}`);
    else results.reviewers.ok++;
  }

  // Researcher accounts
  for (const a of RESEARCHER_ACCOUNTS) {
    const { error } = await adminClient
      .from("researcher_accounts")
      .upsert({ name: a.name, email: a.email, password: a.password }, { onConflict: "email" });
    if (error) results.researchers.errors.push(`${a.name}: ${error.message}`);
    else results.researchers.ok++;
  }

  // Projects
  const supabase = getSupabase();
  for (const p of PROJECTS) {
    const { error } = await supabase
      .from("projects")
      .insert({
        title: p.title,
        researcher_name: p.researcher_name,
        researcher_email: p.researcher_email,
        researcher_role: p.project_type === "pregrado" ? "pregrado"
          : p.project_type === "magister" ? "magister"
          : p.project_type === "doctorado" ? "doctorado"
          : "investigador",
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
  try { adminClient = getSupabaseAdmin(); } catch { adminClient = getSupabase(); }

  const [{ error: e1 }, { error: e2 }, { error: e3 }] = await Promise.all([
    adminClient.from("reviewers").delete().like("email", "%@uai.cl"),
    adminClient.from("projects").delete().like("researcher_email", "%@investigador.cl"),
    adminClient.from("researcher_accounts").delete().like("email", "%@investigador.cl"),
  ]);
  return NextResponse.json({ deleted: true, errors: [e1?.message, e2?.message, e3?.message].filter(Boolean) });
}
