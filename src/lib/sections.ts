export interface Section {
  key: string;
  label: string;
  roman: string;
  description: string;
  criteria: string[];           // what the reviewer should check
  standardCorrections: string[]; // preset phrases when requesting corrections
}

export const sections: Section[] = [
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: "antecedentes_administrativos",
    roman: "I",
    label: "I. Antecedentes administrativos",
    description:
      "Título del proyecto, integrantes del equipo de investigación (rol, nombre completo, RUT, categoría académica, institución y correo institucional de cada integrante).",
    criteria: [
      "El título del proyecto refleja con claridad el contenido y alcance del estudio.",
      "Se identifican todos los integrantes del equipo con su rol, nombre, RUT, categoría académica, institución y correo.",
    ],
    standardCorrections: [
      "El título del proyecto no refleja con claridad el contenido, alcance u objetivo central del estudio.",
      "Falta identificar a uno o más integrantes del equipo de investigación.",
      "No se especifica el rol (investigador/a principal, co-investigador/a, tesista, etc.) de cada integrante.",
      "Falta el RUT de uno o más integrantes del equipo.",
      "No se indica la categoría académica (académico, ayudante, tesista de pregrado/magíster/doctorado) de algún miembro.",
      "Falta el correo institucional de uno o más integrantes.",
      "La institución de algún integrante del equipo no está indicada o es incorrecta.",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    key: "propositos_fundamentacion",
    roman: "II–III",
    label: "II–III. Propósitos, justificación y fundamentación científica",
    description:
      "Hipótesis del proyecto y/o preguntas directrices, objetivo general y objetivos específicos, resumen de la investigación (máx. 250 palabras) y fundamentación científica (máx. 400 palabras). Debe responder: ¿por qué es científicamente relevante el conocimiento que se va a obtener?",
    criteria: [
      "Se formulan las hipótesis del proyecto y/o las preguntas directrices.",
      "Se declaran el objetivo general y los objetivos específicos, coherentes entre sí.",
      "El resumen de la investigación no supera las 250 palabras.",
      "La fundamentación científica no supera las 400 palabras.",
      "Se argumenta por qué el conocimiento a obtener es científicamente relevante.",
      "El estudio se contextualiza en relación con la literatura existente.",
    ],
    standardCorrections: [
      "No se formulan las hipótesis del proyecto y/o las preguntas directrices.",
      "No se declara el objetivo general del proyecto.",
      "No se declaran los objetivos específicos del proyecto.",
      "Los objetivos específicos no son coherentes con el objetivo general ni con las hipótesis o preguntas directrices.",
      "Falta el resumen de la investigación o éste supera las 250 palabras establecidas.",
      "No se presentan con claridad los propósitos de la investigación.",
      "La justificación del estudio es insuficiente o no fundamenta la necesidad de realizar la investigación.",
      "La fundamentación científica supera las 400 palabras establecidas en el formulario.",
      "La fundamentación no responde a la pregunta central: ¿por qué es científicamente relevante el conocimiento que se obtendrá?",
      "No se contextualiza el estudio en relación con la literatura científica existente ni se mencionan antecedentes previos.",
      "Falta argumentar el aporte específico de esta investigación a la disciplina o al campo de conocimiento.",
      "Los propósitos declarados no son coherentes con la metodología ni con los objetivos del estudio.",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    key: "metodologia",
    roman: "IV",
    label: "IV. Metodología",
    description:
      "Descripción general del diseño de investigación y los procedimientos contemplados. Debe describir todos los pasos a seguir para ser evaluados por el comité (diseño, participantes, instrumentos, procedimientos de recolección y análisis de datos).",
    criteria: [
      "Se describe el diseño de investigación de forma clara.",
      "Se detallan los procedimientos paso a paso.",
      "Se especifican los participantes, instrumentos y proceso de análisis.",
    ],
    standardCorrections: [
      "No se describe el diseño de investigación (experimental, cuasi-experimental, correlacional, cualitativo, etc.).",
      "Los procedimientos no están descritos de forma secuencial y clara.",
      "No se especifican los criterios de inclusión y exclusión de los participantes.",
      "No se indica el tamaño muestral (N) requerido ni se justifica.",
      "El tipo o estrategia de muestreo no está especificado.",
      "No se describe la estrategia de reclutamiento y selección de los participantes.",
      "No se describen los instrumentos o técnicas de recolección de información (encuestas, entrevistas, escalas, tareas cognitivas, etc.).",
      "No se indica si los instrumentos ya existen o serán creados y/o validados en el marco de la investigación.",
      "No se indica si los instrumentos están validados para la población objetivo ni se adjuntan como respaldo.",
      "No se describe el proceso de recolección de la información.",
      "No se describe el proceso de análisis de datos ni la estrategia estadística o cualitativa a utilizar (¿cómo se manejarán los datos?).",
      "No se especifican las fechas estimadas de inicio del proyecto, duración e inicio del reclutamiento.",
      "La descripción de los pasos del procedimiento es insuficiente para que el comité pueda evaluarlos.",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    key: "justificacion_metodologia",
    roman: "V",
    label: "V. Justificación de la metodología",
    description:
      "Argumentación de la pertinencia de la metodología, justificando su elección respecto de otras alternativas; valor e importancia del desarrollo de esta metodología para el proyecto (máx. 500 palabras).",
    criteria: [
      "Se justifica la elección metodológica frente a alternativas posibles.",
      "La justificación no supera las 500 palabras.",
      "Se especifica el valor y la importancia del enfoque metodológico para el proyecto.",
    ],
    standardCorrections: [
      "La justificación de la metodología supera las 500 palabras establecidas.",
      "No se argumenta la pertinencia de la metodología elegida ni se compara con otras alternativas disponibles.",
      "No se especifica el valor y la importancia del enfoque metodológico para los objetivos del proyecto.",
      "La justificación metodológica no es coherente con el diseño descrito en la sección de metodología.",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    key: "costo_beneficio_seleccion",
    roman: "a–b",
    label: "a–b. Relación costo–beneficio y selección de participantes",
    description:
      "a) ¿La investigación es invasiva o puede causar malestar o estrés físico, psicológico o de otro tipo? Si sí: medidas de mitigación (explicitadas también en el CI) y consideración de personas próximas al contexto. ¿Beneficiará directa o indirectamente a las personas? b) Detalle de cómo, cuándo, dónde y quién reclutará (anexando invitación, afiche, carta, mail, etc.) y si el diseño incluye individuos vulnerables, con sus medidas de protección.",
    criteria: [
      "Se declara si el estudio es invasivo o puede causar malestar o estrés y, de haberlo, se describen medidas de mitigación.",
      "El potencial malestar y sus mitigaciones se explicitan también en el consentimiento informado.",
      "Se indica si la investigación beneficiará directa o indirectamente a las personas y de qué manera.",
      "Se detalla cómo, cuándo, dónde y quién reclutará a los participantes, anexando los materiales de reclutamiento.",
      "Si hay individuos vulnerables: se identifica el tipo de vulnerabilidad y las medidas de protección.",
    ],
    standardCorrections: [
      "No se indica si la investigación es invasiva o puede causar malestar o estrés físico, psicológico o de otro tipo a las personas.",
      "El estudio declara potencial malestar o efectos adversos, pero no describe medidas de mitigación.",
      "El potencial malestar y sus medidas de mitigación no se explicitan en el consentimiento informado.",
      "No se considera si personas próximas al contexto de la investigación podrían verse afectadas ni se indican medidas de mitigación para ellas.",
      "No se indica si la investigación beneficiará directa o indirectamente a las personas participantes.",
      "Se declaran beneficios, pero no se explica el tipo de beneficio ni de qué manera se materializará.",
      "No se detalla cómo, cuándo, dónde y quién reclutará a las personas participantes.",
      "Se utilizarán textos o medios de comunicación para reclutar, pero no se anexa la documentación (invitación, afiche, carta, circular, mail, inserción en medios, etc.).",
      "No se indica si el diseño del estudio considera la inclusión de individuos vulnerables.",
      "El estudio incluye individuos vulnerables, pero no se identifica el tipo de vulnerabilidad presente.",
      "No se señalan medidas de protección para los individuos vulnerables identificados.",
      "Las medidas de protección para participantes vulnerables son insuficientes o poco específicas.",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    key: "datos_personales",
    roman: "c",
    label: "c. Uso de datos personales",
    description:
      "¿El diseño especifica el destino de los datos personales y asegura confidencialidad? Debe indicarse la cadena de custodia, restricciones de uso y quiénes son los responsables de implementarla.",
    criteria: [
      "Se especifica el destino de los datos personales.",
      "Se describe la cadena de custodia y quiénes tienen acceso.",
      "Se garantiza la confidencialidad mediante medidas concretas (encriptación, anonimización, acceso restringido).",
    ],
    standardCorrections: [
      "No se especifica el destino de los datos personales recopilados durante la investigación.",
      "No se describe la cadena de custodia de los datos personales.",
      "No se indica quiénes son los responsables de implementar la cadena de custodia.",
      "No se especifican las restricciones de uso de los datos personales.",
      "No se describen las medidas concretas para asegurar la confidencialidad (encriptación, anonimización, acceso restringido con clave, etc.).",
      "No se indica el período de almacenamiento de los datos ni el procedimiento para su eliminación posterior.",
      "No se especifica quiénes tendrán acceso a los datos y bajo qué condiciones.",
      "La cadena de custodia descrita es insuficiente para garantizar la protección de los datos personales.",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    key: "voluntariedad_participacion",
    roman: "d",
    label: "d. Voluntariedad en la participación",
    description:
      "Voluntariedad e información a los participantes. En caso de participantes menores de 18 años, debe existir consentimiento informado del adulto responsable más asentimiento informado del/la menor. Si no se aplica, debe argumentarse.",
    criteria: [
      "Se garantiza la voluntariedad de la participación.",
      "Si hay menores de edad: se indica que se usarán CI de adultos + AI de los/as menores.",
      "Si no aplica CI/AI, se argumenta adecuadamente.",
    ],
    standardCorrections: [
      "No se garantiza explícitamente la voluntariedad de la participación ni el derecho a retiro sin consecuencias.",
      "El estudio incluye menores de 18 años, pero no se indica que se utilizará consentimiento informado del adulto responsable.",
      "El estudio incluye menores de 18 años, pero no se indica que se utilizará asentimiento informado del/la menor.",
      "No se describe el proceso para obtener el consentimiento o asentimiento informado.",
      "No se especifica que los documentos de consentimiento/asentimiento explicitan objetivos, procedimientos, confidencialidad y posibilidad de retiro.",
      "Si la respuesta a la aplicación de CI/AI es NO, no se argumenta la razón a la luz del propósito de la investigación.",
      "No se indica si se contempla compensación económica para los participantes ni en qué condiciones.",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    key: "trato_devolucion",
    roman: "e–f",
    label: "e–f. Trato a participantes y devolución de datos",
    description:
      "e) Si la investigación considera pueblos originarios: acciones para resguardar su identidad individual y social. f) Devolución de datos: ¿se contempla devolución a la institución o a los participantes? Si sí, indicar qué datos, cómo y medidas de confidencialidad.",
    criteria: [
      "Si hay pueblos originarios: se describen estrategias específicas de respeto a su identidad.",
      "Se indica claramente si se realizará o no devolución de datos.",
      "Si hay devolución: se especifica qué datos, a quién, cómo y las medidas de confidencialidad.",
    ],
    standardCorrections: [
      "El estudio involucra pueblos originarios, pero no se describen acciones específicas para resguardar el respeto a su identidad individual y social.",
      "Las estrategias de respeto a la identidad de pueblos originarios mencionadas son insuficientes o poco específicas.",
      "No se indica si se contempla devolución de datos a la institución o a los participantes.",
      "Se señala que habrá devolución de datos, pero no se especifica qué datos serán parte de ella.",
      "No se describe la manera en que se realizará la devolución de datos.",
      "No se indican medidas de cuidado para la confidencialidad en caso de devolución a instituciones.",
      "La devolución contemplada no distingue entre datos individuales y datos agregados, lo que podría comprometer la confidencialidad.",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    key: "consentimiento_anexos",
    roman: "g–IV",
    label: "g–IV. Consentimiento informado y anexos",
    description:
      "g) El consentimiento informado (y asentimiento si aplica) debe cumplir el formato UAI e incluir: identificación del investigador/departamento, objetivos, procedimientos, riesgos/molestias, seguros, confidencialidad, voluntariedad, derecho a retiro, duración, beneficios, costos, compensaciones, contacto profesional, firmas y fechas. IV) Anexos requeridos: CI, AI (si aplica), instrumentos, materiales de reclutamiento, cartas de autorización y otros.",
    criteria: [
      "El CI usa el formato UAI y contiene todos los elementos requeridos por la tabla de consideraciones.",
      "Se adjuntan todos los documentos indicados en la sección de Anexos.",
    ],
    standardCorrections: [
      "El consentimiento informado no utiliza el formato oficial UAI.",
      "El CI no identifica al investigador/a responsable ni al departamento o unidad académica.",
      "El CI no explica los objetivos de la investigación de manera comprensible para el/la participante.",
      "El CI no describe los procedimientos o acciones en que participará el/la participante.",
      "El CI no describe los principales riesgos o molestias que puede implicar la participación.",
      "El CI no indica si existen seguros para cubrir eventos adversos.",
      "El CI no explicita las medidas para resguardar la confidencialidad de los datos personales.",
      "El CI no explicita las medidas para resguardar la confidencialidad de los datos recabados durante la investigación y que involucran a las personas.",
      "El CI no explicita la voluntariedad de la participación.",
      "El CI no menciona el derecho a retiro voluntario sin represalias (incluyendo el caso de menores con consentimiento de adultos).",
      "El CI no indica la duración estimada de la participación.",
      "El CI no menciona los beneficios de participar en el estudio.",
      "El CI no indica si existen costos para el/la participante.",
      "El CI no menciona si existen pagos o compensaciones por participar.",
      "El CI no identifica al/la profesional a quien consultar dudas durante la investigación.",
      "Faltan las firmas o fechas del/la participante y del/la investigador/a responsable.",
      "El asentimiento informado (AI) no entrega información general de la investigación.",
      "El AI no consulta explícitamente la voluntad de participar del/la menor.",
      "El asentimiento informado (AI) no utiliza lenguaje adecuado a la edad de los/as menores.",
      "El AI no está acompañado del consentimiento informado del adulto responsable.",
      "No se adjunta el formulario de consentimiento informado.",
      "No se adjunta el asentimiento informado siendo el estudio con menores de edad.",
      "No se adjuntan los instrumentos, encuestas o formularios utilizados en la investigación.",
      "No se adjuntan los materiales de reclutamiento (afiche, carta, correo, inserción en medios, etc.).",
      "Falta la carta de apoyo del jefe/a de departamento/división/sección.",
      "Faltan cartas de autorización de las instituciones participantes.",
      "No se adjuntan las certificaciones en ética de investigación del equipo.",
    ],
  },
];
