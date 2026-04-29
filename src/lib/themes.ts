export const themes = [
  { id: "clinica",         label: "Psicología Clínica y de la Salud",    desc: "Intervenciones terapéuticas, salud mental, psicopatología",   emoji: "🧠" },
  { id: "social",          label: "Psicología Social y Comunitaria",      desc: "Comportamiento social, grupos, comunidades",                   emoji: "👥" },
  { id: "desarrollo",      label: "Psicología del Desarrollo",            desc: "Ciclo vital, infancia, adolescencia, adultez",                 emoji: "🌱" },
  { id: "cognitiva",       label: "Psicología Cognitiva y Neurociencias", desc: "Procesos mentales, neuropsicología, cognición",                emoji: "⚡" },
  { id: "organizacional",  label: "Psicología Organizacional",            desc: "Comportamiento laboral, organizaciones, liderazgo",            emoji: "🏢" },
  { id: "educacional",     label: "Psicología Educacional",               desc: "Aprendizaje, contexto escolar, psicopedagogía",                emoji: "📚" },
  { id: "forense",         label: "Psicología Forense y Jurídica",        desc: "Contexto legal, peritajes, víctimas",                          emoji: "⚖️" },
  { id: "metodologia",     label: "Metodología de Investigación",         desc: "Métodos cualitativos, cuantitativos, mixtos",                  emoji: "📊" },
];

export function getThemeLabel(id: string): string {
  return themes.find((t) => t.id === id)?.label ?? id;
}
