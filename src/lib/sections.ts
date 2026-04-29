export interface Section {
  key: string;
  label: string;
  description: string;
  standardCorrections: string[];
}

export const sections: Section[] = [
  {
    key: "antecedentes_administrativos",
    label: "I. Antecedentes administrativos",
    description: "Título de la investigación y equipo de investigación (rol, nombre, RUT, categoría académica, institución, email de cada integrante).",
    standardCorrections: [
      "El título de la investigación no refleja con claridad el contenido o alcance del estudio.",
      "Faltan integrantes del equipo o sus roles no están correctamente especificados.",
      "La categoría académica de uno o más integrantes está incompleta o es incorrecta.",
      "Falta el RUT o email institucional de algún miembro del equipo.",
      "La institución de algún integrante no está indicada.",
    ],
  },
  {
    key: "hipotesis_objetivos",
    label: "II.1 Hipótesis y objetivos",
    description: "Hipótesis del proyecto y/o preguntas directrices, objetivo general y objetivos específicos.",
    standardCorrections: [
      "Las hipótesis no están claramente formuladas o no son contrastables empíricamente.",
      "Falta la pregunta directriz o pregunta de investigación.",
      "El objetivo general no está claramente definido o no es coherente con las hipótesis.",
      "Los objetivos específicos no se desprenden lógicamente del objetivo general.",
      "Los objetivos no son medibles ni alcanzables dentro del marco del estudio.",
      "Falta correspondencia entre los objetivos específicos y la metodología propuesta.",
    ],
  },
  {
    key: "resumen_fundamentacion",
    label: "II.2 Resumen y fundamentación científica",
    description: "Resumen de la investigación (máx. 250 palabras) y fundamentación científica sobre la relevancia del conocimiento a obtener (máx. 400 palabras).",
    standardCorrections: [
      "El resumen supera las 250 palabras establecidas en el formulario.",
      "El resumen no describe con claridad los objetivos, participantes y metodología del estudio.",
      "La fundamentación científica supera las 400 palabras establecidas.",
      "La fundamentación no justifica adecuadamente la relevancia científica del conocimiento que se obtendrá.",
      "No se contextualiza el estudio en relación con la literatura existente.",
      "Falta argumentar por qué el conocimiento a obtener es relevante para la psicología u otras disciplinas afines.",
    ],
  },
  {
    key: "metodologia_muestreo_instrumentos",
    label: "II.3 Metodología: Muestreo e instrumentos",
    description: "Estrategia de muestreo (N requerido, tipo de muestreo, reclutamiento y selección), e instrumentos a utilizar (encuestas, entrevistas, formularios, escalas, etc.).",
    standardCorrections: [
      "No se justifica el tamaño muestral (N) requerido para el estudio.",
      "El tipo de muestreo no está especificado o no corresponde al diseño del estudio.",
      "La estrategia de reclutamiento no está descrita con suficiente detalle.",
      "No se especifican los criterios de inclusión y exclusión de los participantes.",
      "Los instrumentos a utilizar no están descritos o no se adjuntan como respaldo.",
      "No se indica si los instrumentos están validados para la población objetivo.",
      "Falta justificar la elección de los instrumentos frente a alternativas disponibles.",
      "No se especifican las propiedades psicométricas de los instrumentos empleados.",
    ],
  },
  {
    key: "metodologia_recoleccion_analisis",
    label: "II.4 Metodología: Recolección, análisis y justificación",
    description: "Proceso de recolección de información, proceso de análisis de los datos y justificación de la metodología (máx. 500 palabras).",
    standardCorrections: [
      "El proceso de recolección de información no está descrito paso a paso de forma secuencial.",
      "No se describe cómo se registrará, almacenará o codificará la información recolectada.",
      "El proceso de análisis de datos no está suficientemente detallado.",
      "La estrategia de análisis no es coherente con el diseño metodológico del estudio.",
      "La justificación de la metodología supera las 500 palabras establecidas.",
      "No se argumenta la pertinencia de la metodología frente a otras alternativas posibles.",
      "Falta describir el cronograma o fechas estimadas de las fases del proceso.",
      "Las fechas de inicio del proyecto, reclutamiento y duración no están especificadas.",
    ],
  },
  {
    key: "etica_riesgos_beneficios",
    label: "III.a–b Riesgos, beneficios y selección de participantes",
    description: "Relación costo-beneficio (invasividad, malestar potencial, beneficios), selección de personas (reclutamiento, materiales de convocatoria) e inclusión de individuos vulnerables.",
    standardCorrections: [
      "No se especifica si la investigación es invasiva o puede causar malestar físico o psicológico.",
      "Los riesgos o molestias potenciales no están suficientemente descritos.",
      "Faltan medidas de mitigación ante posibles efectos adversos o malestar.",
      "No se describe si la investigación beneficia directa o indirectamente a los participantes.",
      "No se detalla quién, cómo, cuándo y dónde se reclutará a los participantes.",
      "No se adjuntan los materiales de convocatoria (afiche, carta, correo, etc.).",
      "No se indica si el estudio involucra individuos vulnerables ni las medidas de protección correspondientes.",
      "No se menciona si participantes próximos al contexto del estudio podrían verse afectados.",
    ],
  },
  {
    key: "etica_datos_voluntariedad",
    label: "III.c–f Datos personales, voluntariedad y devolución",
    description: "Confidencialidad y cadena de custodia de datos personales, voluntariedad y derecho a retiro, aspectos de trato (pueblos originarios si aplica) y devolución de resultados.",
    standardCorrections: [
      "No se especifica el destino de los datos personales ni la cadena de custodia.",
      "No se describe el sistema de seudonimización, anonimización o encriptación de los datos.",
      "No se indica quiénes tendrán acceso a los datos y bajo qué condiciones.",
      "No se señala el período de almacenamiento ni el proceso de eliminación de los datos.",
      "No se garantiza explícitamente la voluntariedad de la participación y el derecho a retiro sin consecuencias.",
      "En caso de participantes menores de 18 años, falta especificar el manejo del asentimiento informado.",
      "Si el estudio involucra pueblos originarios, no se describen las estrategias de respeto a su identidad.",
      "No se indica si se realizará devolución de resultados a la institución o a los participantes, ni de qué forma.",
    ],
  },
  {
    key: "consentimiento_anexos",
    label: "III.g – IV. Consentimiento informado y anexos",
    description: "Consentimiento informado (y asentimiento si aplica): cumplimiento del formato UAI y elementos requeridos. Anexos: instrumentos, materiales de reclutamiento, carta Gantt y otros documentos.",
    standardCorrections: [
      "El consentimiento informado no utiliza el formato UAI.",
      "El consentimiento no identifica al investigador responsable y al departamento.",
      "No se describen con claridad los procedimientos en que participará el/la participante.",
      "No se explicita el derecho a retiro voluntario sin represalias.",
      "No se indican los riesgos, molestias o beneficios de participar en el consentimiento.",
      "No se especifica la duración de la participación ni los costos o compensaciones.",
      "No se incluye la identificación del profesional a consultar en caso de dudas.",
      "Faltan firmas o fechas del participante y del investigador responsable.",
      "No se adjunta el formulario de consentimiento informado.",
      "Faltan uno o más instrumentos, encuestas o formularios como respaldo.",
      "No se adjuntan los materiales de reclutamiento (afiche, carta, correo, etc.).",
      "Falta la Carta Gantt u otros documentos indicados como 'Otros' en la sección de anexos.",
    ],
  },
];
