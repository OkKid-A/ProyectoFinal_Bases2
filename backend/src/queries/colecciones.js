const { getDb } = require('../db/mongo');

// Colección aspirantes: un documento por aspirante con sus evaluaciones
const PIPELINE_ASPIRANTES = [
  { $sort: { aspirante_id: 1, fecha_asignacion: 1, intento: 1 } },
  {
    $group: {
      _id: '$aspirante_id',
      sexo: { $last: '$sexo' },
      anio_nacimiento: { $max: '$anio_nacimiento' },
      edad_primera_evaluacion: { $first: '$edad' },
      carrera_objetivo: { $last: '$carrera_objetivo' },
      tipo_institucion: { $last: '$tipo_institucion' },
      departamento: { $last: '$departamento' },
      municipio: { $last: '$municipio' },
      carreras: { $addToSet: '$carrera_objetivo' },
      anios_ingreso: { $addToSet: '$anio_de_ingreso' },
      total_evaluaciones: { $sum: 1 },
      total_aprobadas: { $sum: { $cond: ['$aprobado', 1, 0] } },
      primera_evaluacion: { $first: '$fecha_asignacion' },
      ultima_evaluacion: { $last: '$fecha_asignacion' },
      evaluaciones: {
        $push: {
          id: '$_id',
          fecha: '$fecha_asignacion',
          materia: '$materia',
          intento: '$intento',
          anio_de_ingreso: '$anio_de_ingreso',
          aprobacion: '$aprobacion',
          aprobado: '$aprobado',
          carrera_objetivo: '$carrera_objetivo',
          edad: '$edad',
        },
      },
    },
  },
  {
    $set: {
      materias_aprobadas: {
        $setUnion: [
          { $map: { input: { $filter: { input: '$evaluaciones', cond: '$$this.aprobado' } }, in: '$$this.materia' } },
        ],
      },
      actualizado: '$$NOW',
    },
  },
  { $merge: { into: 'aspirantes', on: '_id', whenMatched: 'replace', whenNotMatched: 'insert' } },
];

async function regenerarAspirantes() {
  await getDb().collection('evaluaciones').aggregate(PIPELINE_ASPIRANTES, { allowDiskUse: true }).toArray();
}

// Consulta 6: colección resumen_carrera
const PIPELINE_RESUMEN_CARRERA = [
  {
    $group: {
      _id: { carrera: '$carrera_objetivo', materia: '$materia' },
      evaluaciones: { $sum: 1 },
      aprobadas: { $sum: { $cond: ['$aprobado', 1, 0] } },
      aspirantes: { $addToSet: '$aspirante_id' },
      edades: { $push: '$edad' },
      anios: { $addToSet: '$anio_de_ingreso' },
    },
  },
  {
    $group: {
      _id: '$_id.carrera',
      total_evaluaciones: { $sum: '$evaluaciones' },
      total_aprobadas: { $sum: '$aprobadas' },
      aspirantes: { $push: '$aspirantes' },
      edades: { $push: '$edades' },
      anios: { $push: '$anios' },
      por_materia: {
        $push: {
          materia: '$_id.materia',
          evaluaciones: '$evaluaciones',
          aprobadas: '$aprobadas',
          porcentaje_aprobacion: {
            $round: [{ $multiply: [{ $divide: ['$aprobadas', '$evaluaciones'] }, 100] }, 2],
          },
        },
      },
    },
  },
  {
    $project: {
      carrera: '$_id',
      total_evaluaciones: 1,
      total_aprobadas: 1,
      total_no_aprobadas: { $subtract: ['$total_evaluaciones', '$total_aprobadas'] },
      porcentaje_aprobacion: {
        $round: [{ $multiply: [{ $divide: ['$total_aprobadas', '$total_evaluaciones'] }, 100] }, 2],
      },
      total_aspirantes: {
        $size: { $reduce: { input: '$aspirantes', initialValue: [], in: { $setUnion: ['$$value', '$$this'] } } },
      },
      edad_promedio: {
        $round: [
          { $avg: { $reduce: { input: '$edades', initialValue: [], in: { $concatArrays: ['$$value', '$$this'] } } } },
          2,
        ],
      },
      anios_ingreso: {
        $sortArray: {
          input: { $reduce: { input: '$anios', initialValue: [], in: { $setUnion: ['$$value', '$$this'] } } },
          sortBy: 1,
        },
      },
      por_materia: { $sortArray: { input: '$por_materia', sortBy: { materia: 1 } } },
      generado: '$$NOW',
    },
  },
  { $out: 'resumen_carrera' },
];

async function generarResumenCarrera() {
  await getDb().collection('evaluaciones').aggregate(PIPELINE_RESUMEN_CARRERA, { allowDiskUse: true }).toArray();
  return getDb().collection('resumen_carrera').find().sort({ total_aspirantes: -1 }).toArray();
}

module.exports = {
  PIPELINE_ASPIRANTES,
  PIPELINE_RESUMEN_CARRERA,
  regenerarAspirantes,
  generarResumenCarrera,
};
