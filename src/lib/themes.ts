export const themes = [
  { id: "clinica",         label: "Psicología Clínica y de la Salud",    short: "Clínica y Salud",        desc: "Intervenciones terapéuticas, salud mental, psicopatología",          emoji: "🧠" },
  { id: "social",          label: "Psicología Social y Comunitaria",      short: "Social y Comunitaria",   desc: "Comportamiento social, grupos, comunidades",                          emoji: "👥" },
  { id: "desarrollo",      label: "Psicología del Desarrollo",            short: "Desarrollo",             desc: "Ciclo vital, infancia, adolescencia, adultez",                        emoji: "🌱" },
  { id: "cognitiva",       label: "Psicología Cognitiva",                 short: "Cognitiva",              desc: "Procesos mentales, memoria, atención, toma de decisiones",            emoji: "⚡" },
  { id: "neurociencias",   label: "Neurociencias",                        short: "Neurociencias",          desc: "Neuropsicología, cerebro y comportamiento, neuroimagen",              emoji: "🔬" },
  { id: "organizacional",  label: "Psicología Organizacional",            short: "Organizacional",         desc: "Comportamiento laboral, organizaciones, liderazgo",                   emoji: "🏢" },
  { id: "educacional",     label: "Psicología Educacional",               short: "Educacional",            desc: "Aprendizaje, contexto escolar, psicopedagogía",                       emoji: "📚" },
  { id: "forense",         label: "Psicología Forense y Jurídica",        short: "Forense y Jurídica",     desc: "Contexto legal, peritajes, víctimas",                                 emoji: "⚖️" },
  { id: "metodologia",     label: "Metodología de Investigación",         short: "Metodología",            desc: "Métodos cualitativos, cuantitativos, mixtos",                         emoji: "📊" },
];

export function getThemeLabel(id: string): string {
  return themes.find((t) => t.id === id)?.label ?? id;
}
