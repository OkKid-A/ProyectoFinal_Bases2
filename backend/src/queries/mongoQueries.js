// Las 20 consultas de MongoDB
const { PIPELINE_RESUMEN_CARRERA } = require('./colecciones');

const pct = (parte, total) => ({
  $round: [{ $multiply: [{ $divide: [parte, total] }, 100] }, 2],
});

// Filtro opcional por año de ingreso
const filtroAnio = (p) => (p.anio ? [{ $match: { anio_de_ingreso: Number(p.anio) } }] : []);

const consultas = [
  {
    id: 1,
    titulo: 'Aspirantes por tipo de institución educativa',
    descripcion: 'Cantidad de aspirantes distintos agrupados por tipo de institución de procedencia.',
    coleccion: 'evaluaciones',
    viz: { tipo: 'pie', x: 'tipo_institucion', y: ['aspirantes'] },
    pipeline: (p) => [
      ...filtroAnio(p),
      { $group: { _id: { tipo: '$tipo_institucion', aspirante: '$aspirante_id' } } },
      { $group: { _id: '$_id.tipo', aspirantes: { $sum: 1 } } },
      { $project: { _id: 0, tipo_institucion: '$_id', aspirantes: 1 } },
      { $sort: { aspirantes: -1 } },
    ],
  },
  {
    id: 2,
    titulo: 'Cantidad de aprobados por materia',
    descripcion: 'Número de evaluaciones con resultado APROBADO por materia.',
    coleccion: 'evaluaciones',
    viz: { tipo: 'bar', x: 'materia', y: ['aprobadas'] },
    pipeline: (p) => [
      ...filtroAnio(p),
      { $match: { aprobado: true } },
      { $group: { _id: '$materia', aprobadas: { $sum: 1 } } },
      { $project: { _id: 0, materia: '$_id', aprobadas: 1 } },
      { $sort: { aprobadas: -1 } },
    ],
  },
  {
    id: 3,
    titulo: 'Aprobados por carrera y año de ingreso',
    descripcion: 'Aspirantes distintos con al menos una evaluación aprobada, por carrera objetivo y año de ingreso.',
    coleccion: 'evaluaciones',
    viz: { tipo: 'pivot', x: 'carrera_objetivo', serie: 'anio_de_ingreso', y: 'aprobados' },
    pipeline: (p) => [
      ...filtroAnio(p),
      { $match: { aprobado: true } },
      {
        $group: {
          _id: { carrera: '$carrera_objetivo', anio: '$anio_de_ingreso', aspirante: '$aspirante_id' },
        },
      },
      { $group: { _id: { carrera: '$_id.carrera', anio: '$_id.anio' }, aprobados: { $sum: 1 } } },
      { $project: { _id: 0, carrera_objetivo: '$_id.carrera', anio_de_ingreso: '$_id.anio', aprobados: 1 } },
      { $sort: { anio_de_ingreso: 1, aprobados: -1 } },
    ],
  },
  {
    id: 4,
    titulo: 'Porcentaje de aprobación por materia',
    descripcion: 'Evaluaciones aprobadas / evaluaciones totales por materia.',
    coleccion: 'evaluaciones',
    viz: { tipo: 'bar', x: 'materia', y: ['porcentaje_aprobacion'], sufijo: '%' },
    pipeline: (p) => [
      ...filtroAnio(p),
      {
        $group: {
          _id: '$materia',
          total: { $sum: 1 },
          aprobadas: { $sum: { $cond: ['$aprobado', 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          materia: '$_id',
          total: 1,
          aprobadas: 1,
          porcentaje_aprobacion: pct('$aprobadas', '$total'),
        },
      },
      { $sort: { porcentaje_aprobacion: -1 } },
    ],
  },
  {
    id: 5,
    titulo: 'Promedio de edad por carrera',
    descripcion: 'Edad promedio de los aspirantes (edad en su primera evaluación) por carrera objetivo.',
    coleccion: 'evaluaciones',
    viz: { tipo: 'bar', x: 'carrera_objetivo', y: ['edad_promedio'] },
    pipeline: (p) => [
      ...filtroAnio(p),
      { $match: { edad: { $ne: null } } },
      { $group: { _id: { carrera: '$carrera_objetivo', aspirante: '$aspirante_id' }, edad: { $min: '$edad' } } },
      { $group: { _id: '$_id.carrera', edad_promedio: { $avg: '$edad' }, aspirantes: { $sum: 1 } } },
      { $project: { _id: 0, carrera_objetivo: '$_id', edad_promedio: { $round: ['$edad_promedio', 2] }, aspirantes: 1 } },
      { $sort: { edad_promedio: -1 } },
    ],
  },
  {
    id: 6,
    titulo: 'Colección auxiliar resumen_carrera',
    descripcion:
      'Genera (con $out) la colección resumen_carrera con totales, tasa de aprobación, edad promedio y desglose por materia de cada carrera.',
    coleccion: 'evaluaciones',
    especial: 'resumen_carrera',
    viz: { tipo: 'tabla' },
    pipeline: () => PIPELINE_RESUMEN_CARRERA,
  },
  {
    id: 7,
    titulo: 'Edad promedio de aprobados por carrera y tipo de institución',
    descripcion: 'Edad promedio de los aspirantes que aprobaron, agrupada por carrera objetivo y tipo de institución.',
    coleccion: 'evaluaciones',
    viz: { tipo: 'pivot', x: 'carrera_objetivo', serie: 'tipo_institucion', y: 'edad_promedio' },
    pipeline: (p) => [
      ...filtroAnio(p),
      { $match: { aprobado: true, edad: { $ne: null } } },
      {
        $group: {
          _id: { carrera: '$carrera_objetivo', tipo: '$tipo_institucion', aspirante: '$aspirante_id' },
          edad: { $min: '$edad' },
        },
      },
      {
        $group: {
          _id: { carrera: '$_id.carrera', tipo: '$_id.tipo' },
          edad_promedio: { $avg: '$edad' },
          aspirantes: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          carrera_objetivo: '$_id.carrera',
          tipo_institucion: '$_id.tipo',
          edad_promedio: { $round: ['$edad_promedio', 2] },
          aspirantes: 1,
        },
      },
      { $sort: { carrera_objetivo: 1, tipo_institucion: 1 } },
    ],
  },
  {
    id: 8,
    titulo: 'Distribución de aprobados por municipio y carrera objetivo',
    descripcion: 'Aspirantes aprobados según el municipio de la institución educativa y la carrera objetivo.',
    coleccion: 'evaluaciones',
    viz: { tipo: 'tabla' },
    pipeline: (p) => [
      ...filtroAnio(p),
      { $match: { aprobado: true } },
      {
        $group: {
          _id: {
            departamento: '$departamento',
            municipio: '$municipio',
            carrera: '$carrera_objetivo',
            aspirante: '$aspirante_id',
          },
        },
      },
      {
        $group: {
          _id: { departamento: '$_id.departamento', municipio: '$_id.municipio', carrera: '$_id.carrera' },
          aprobados: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          departamento: '$_id.departamento',
          municipio: '$_id.municipio',
          carrera_objetivo: '$_id.carrera',
          aprobados: 1,
        },
      },
      { $sort: { aprobados: -1, municipio: 1 } },
    ],
  },
  {
    id: 9,
    titulo: 'Evaluaciones por mes y materia (instituciones públicas)',
    descripcion: 'Cantidad de evaluaciones por mes de asignación y materia, sólo para aspirantes de instituciones públicas.',
    coleccion: 'evaluaciones',
    params: [{ nombre: 'tipo', etiqueta: 'Tipo de institución', defecto: 'PUBLICO' }],
    viz: { tipo: 'pivot-line', x: 'mes', serie: 'materia', y: 'evaluaciones' },
    pipeline: (p) => [
      ...filtroAnio(p),
      { $match: { tipo_institucion: p.tipo || 'PUBLICO' } },
      {
        $group: {
          _id: { mes: { $dateToString: { format: '%Y-%m', date: '$fecha_asignacion' } }, materia: '$materia' },
          evaluaciones: { $sum: 1 },
        },
      },
      { $project: { _id: 0, mes: '$_id.mes', materia: '$_id.materia', evaluaciones: 1 } },
      { $sort: { mes: 1, materia: 1 } },
    ],
  },
  {
    id: 10,
    titulo: 'Top 5 carreras más demandadas (aspirantes de 16 a 18 años)',
    descripcion: 'Las 5 carreras con más aspirantes distintos con edad entre 16 y 18 años (excluye NINGUNO).',
    coleccion: 'evaluaciones',
    viz: { tipo: 'bar', x: 'carrera_objetivo', y: ['aspirantes'] },
    pipeline: (p) => [
      ...filtroAnio(p),
      { $match: { edad: { $gte: 16, $lte: 18 }, carrera_objetivo: { $ne: 'NINGUNO' } } },
      { $group: { _id: { carrera: '$carrera_objetivo', aspirante: '$aspirante_id' } } },
      { $group: { _id: '$_id.carrera', aspirantes: { $sum: 1 } } },
      { $sort: { aspirantes: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, carrera_objetivo: '$_id', aspirantes: 1 } },
    ],
  },
  {
    id: 11,
    titulo: 'Historial de desempeño por aspirante',
    descripcion: 'Evaluaciones de un aspirante agrupadas por materia: intentos, resultados y si logró aprobar.',
    coleccion: 'evaluaciones',
    params: [{ nombre: 'aspirante', etiqueta: 'Correlativo del aspirante', requerido: true }],
    viz: { tipo: 'historial' },
    pipeline: (p) => [
      { $match: { aspirante_id: String(p.aspirante || '').trim().toLowerCase() } },
      { $sort: { fecha_asignacion: 1, intento: 1 } },
      {
        $group: {
          _id: '$materia',
          intentos: { $sum: 1 },
          aprobada: { $max: '$aprobado' },
          primera_fecha: { $first: '$fecha_asignacion' },
          ultima_fecha: { $last: '$fecha_asignacion' },
          detalle: {
            $push: {
              fecha: '$fecha_asignacion',
              intento: '$intento',
              anio_de_ingreso: '$anio_de_ingreso',
              resultado: '$aprobacion',
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          materia: '$_id',
          intentos: 1,
          aprobada: 1,
          primera_fecha: 1,
          ultima_fecha: 1,
          detalle: 1,
        },
      },
      { $sort: { materia: 1 } },
    ],
  },
  {
    id: 12,
    titulo: 'Distribución por sexo y tipo de institución',
    descripcion: 'Aspirantes distintos agrupados por sexo y tipo de institución educativa.',
    coleccion: 'evaluaciones',
    viz: { tipo: 'pivot', x: 'tipo_institucion', serie: 'sexo', y: 'aspirantes' },
    pipeline: (p) => [
      ...filtroAnio(p),
      { $group: { _id: { sexo: '$sexo', tipo: '$tipo_institucion', aspirante: '$aspirante_id' } } },
      { $group: { _id: { sexo: '$_id.sexo', tipo: '$_id.tipo' }, aspirantes: { $sum: 1 } } },
      { $project: { _id: 0, sexo: '$_id.sexo', tipo_institucion: '$_id.tipo', aspirantes: 1 } },
      { $sort: { tipo_institucion: 1, sexo: 1 } },
    ],
  },
  {
    id: 13,
    titulo: 'Tasa de aprobación por edad',
    descripcion: 'Porcentaje de evaluaciones aprobadas para cada edad (excluye edades desconocidas).',
    coleccion: 'evaluaciones',
    viz: { tipo: 'line', x: 'edad', y: ['porcentaje_aprobacion'], sufijo: '%' },
    pipeline: (p) => [
      ...filtroAnio(p),
      { $match: { edad: { $ne: null } } },
      {
        $group: {
          _id: '$edad',
          total: { $sum: 1 },
          aprobadas: { $sum: { $cond: ['$aprobado', 1, 0] } },
        },
      },
      { $project: { _id: 0, edad: '$_id', total: 1, aprobadas: 1, porcentaje_aprobacion: pct('$aprobadas', '$total') } },
      { $sort: { edad: 1 } },
    ],
  },
  {
    id: 14,
    titulo: 'Número promedio de intentos por materia',
    descripcion: 'Promedio de evaluaciones (oportunidades) que usa cada aspirante en cada materia.',
    coleccion: 'evaluaciones',
    viz: { tipo: 'bar', x: 'materia', y: ['promedio_intentos'] },
    pipeline: (p) => [
      ...filtroAnio(p),
      { $group: { _id: { materia: '$materia', aspirante: '$aspirante_id' }, intentos: { $sum: 1 } } },
      {
        $group: {
          _id: '$_id.materia',
          promedio_intentos: { $avg: '$intentos' },
          maximo_intentos: { $max: '$intentos' },
          aspirantes: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          materia: '$_id',
          promedio_intentos: { $round: ['$promedio_intentos', 2] },
          maximo_intentos: 1,
          aspirantes: 1,
        },
      },
      { $sort: { promedio_intentos: -1 } },
    ],
  },
  {
    id: 15,
    titulo: 'Historial completo de un aspirante',
    descripcion: 'Toda la información disponible de un aspirante (documento de la colección aspirantes).',
    coleccion: 'aspirantes',
    params: [{ nombre: 'aspirante', etiqueta: 'Correlativo del aspirante', requerido: true }],
    viz: { tipo: 'aspirante' },
    pipeline: (p) => [{ $match: { _id: String(p.aspirante || '').trim().toLowerCase() } }],
  },
  {
    id: 16,
    titulo: 'Carreras con más aspirantes reprobados en primer intento',
    descripcion:
      'Para cada aspirante y materia se toma la primera evaluación (por fecha); se cuentan los aspirantes que no la aprobaron.',
    coleccion: 'evaluaciones',
    viz: { tipo: 'bar', x: 'carrera_objetivo', y: ['aspirantes_reprobados'] },
    pipeline: (p) => [
      ...filtroAnio(p),
      { $sort: { aspirante_id: 1, materia: 1, fecha_asignacion: 1, intento: 1 } },
      {
        $group: {
          _id: { aspirante: '$aspirante_id', materia: '$materia' },
          primer_resultado: { $first: '$aprobado' },
          carrera: { $first: '$carrera_objetivo' },
        },
      },
      { $match: { primer_resultado: false } },
      { $group: { _id: { carrera: '$carrera', aspirante: '$_id.aspirante' } } },
      { $group: { _id: '$_id.carrera', aspirantes_reprobados: { $sum: 1 } } },
      { $project: { _id: 0, carrera_objetivo: '$_id', aspirantes_reprobados: 1 } },
      { $sort: { aspirantes_reprobados: -1 } },
    ],
  },
  {
    id: 17,
    titulo: 'Top 5 municipios con más aspirantes',
    descripcion: 'Los 5 municipios de la institución de procedencia con más aspirantes distintos.',
    coleccion: 'evaluaciones',
    viz: { tipo: 'bar', x: 'municipio', y: ['aspirantes'] },
    pipeline: (p) => [
      ...filtroAnio(p),
      { $group: { _id: { departamento: '$departamento', municipio: '$municipio', aspirante: '$aspirante_id' } } },
      { $group: { _id: { departamento: '$_id.departamento', municipio: '$_id.municipio' }, aspirantes: { $sum: 1 } } },
      { $sort: { aspirantes: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, municipio: '$_id.municipio', departamento: '$_id.departamento', aspirantes: 1 } },
    ],
  },
  {
    id: 18,
    titulo: 'Tasa de aprobación por tipo de institución',
    descripcion: 'Porcentaje de evaluaciones aprobadas según el tipo de institución educativa.',
    coleccion: 'evaluaciones',
    viz: { tipo: 'bar', x: 'tipo_institucion', y: ['porcentaje_aprobacion'], sufijo: '%' },
    pipeline: (p) => [
      ...filtroAnio(p),
      {
        $group: {
          _id: '$tipo_institucion',
          total: { $sum: 1 },
          aprobadas: { $sum: { $cond: ['$aprobado', 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          tipo_institucion: '$_id',
          total: 1,
          aprobadas: 1,
          porcentaje_aprobacion: pct('$aprobadas', '$total'),
        },
      },
      { $sort: { porcentaje_aprobacion: -1 } },
    ],
  },
  {
    id: 19,
    titulo: 'Carreras más demandadas por departamento',
    descripcion: 'Para cada departamento, las 3 carreras con más aspirantes distintos (excluye NINGUNO).',
    coleccion: 'evaluaciones',
    viz: { tipo: 'tabla' },
    pipeline: (p) => [
      ...filtroAnio(p),
      { $match: { carrera_objetivo: { $ne: 'NINGUNO' } } },
      {
        $group: { _id: { departamento: '$departamento', carrera: '$carrera_objetivo', aspirante: '$aspirante_id' } },
      },
      {
        $group: { _id: { departamento: '$_id.departamento', carrera: '$_id.carrera' }, aspirantes: { $sum: 1 } },
      },
      { $sort: { '_id.departamento': 1, aspirantes: -1 } },
      {
        $group: {
          _id: '$_id.departamento',
          carreras: { $push: { carrera: '$_id.carrera', aspirantes: '$aspirantes' } },
        },
      },
      {
        $project: {
          _id: 0,
          departamento: '$_id',
          carrera_mas_demandada: { $arrayElemAt: ['$carreras.carrera', 0] },
          aspirantes: { $arrayElemAt: ['$carreras.aspirantes', 0] },
          top_3: { $slice: ['$carreras', 3] },
        },
      },
      { $sort: { aspirantes: -1 } },
    ],
  },
  {
    id: 20,
    titulo: 'Evolución de aprobación por año de ingreso',
    descripcion: 'Cantidad y porcentaje de evaluaciones aprobadas y no aprobadas por año de ingreso.',
    coleccion: 'evaluaciones',
    viz: { tipo: 'evolucion', x: 'anio_de_ingreso' },
    pipeline: (p) => [
      ...filtroAnio(p),
      {
        $group: {
          _id: '$anio_de_ingreso',
          total: { $sum: 1 },
          aprobadas: { $sum: { $cond: ['$aprobado', 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          anio_de_ingreso: '$_id',
          total: 1,
          aprobadas: 1,
          no_aprobadas: { $subtract: ['$total', '$aprobadas'] },
          porcentaje_aprobadas: pct('$aprobadas', '$total'),
          porcentaje_no_aprobadas: pct({ $subtract: ['$total', '$aprobadas'] }, '$total'),
        },
      },
      { $sort: { anio_de_ingreso: 1 } },
    ],
  },
];

module.exports = { consultas };
