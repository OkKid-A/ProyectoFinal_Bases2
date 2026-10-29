const { Router } = require('express');
const { BSON } = require('mongodb');
const { getDb } = require('../db/mongo');
const { consultas } = require('../queries/mongoQueries');
const { generarResumenCarrera } = require('../queries/colecciones');
const { AppError } = require('../middleware/errors');

const router = Router();

const metadatos = ({ pipeline, ...resto }) => resto;

router.get('/consultas', (req, res) => {
  res.json(consultas.map(metadatos));
});

router.get('/consultas/:id', async (req, res) => {
  const consulta = consultas.find((c) => c.id === Number(req.params.id));
  if (!consulta) throw new AppError(404, `No existe la consulta ${req.params.id}`);

  const params = { ...req.query };
  if (params.anio && !/^\d{4}$/.test(params.anio)) throw new AppError(400, 'El año debe tener 4 dígitos');
  for (const p of consulta.params || []) {
    if (p.requerido && !String(params[p.nombre] ?? '').trim()) {
      throw new AppError(400, `El parámetro "${p.etiqueta}" es obligatorio`);
    }
  }

  const pipeline = consulta.pipeline(params);
  const inicio = Date.now();
  let datos;
  if (consulta.especial === 'resumen_carrera') {
    datos = await generarResumenCarrera();
  } else {
    datos = await getDb().collection(consulta.coleccion).aggregate(pipeline, { allowDiskUse: true }).toArray();
  }

  if (consulta.params?.some((p) => p.nombre === 'aspirante') && datos.length === 0) {
    throw new AppError(404, `No se encontró el aspirante "${params.aspirante}"`);
  }

  res.json({
    consulta: metadatos(consulta),
    coleccion: consulta.coleccion,
    pipeline,
    duracion_ms: Date.now() - inicio,
    datos,
  });
});

router.get('/kpis', async (req, res) => {
  const filtro = req.query.anio ? { anio_de_ingreso: Number(req.query.anio) } : {};
  const ev = getDb().collection('evaluaciones');
  const [resultado] = await ev
    .aggregate([
      { $match: filtro },
      {
        $facet: {
          totales: [
            {
              $group: {
                _id: null,
                evaluaciones: { $sum: 1 },
                aprobadas: { $sum: { $cond: ['$aprobado', 1, 0] } },
                edad_promedio: { $avg: '$edad' },
              },
            },
          ],
          aspirantes: [{ $group: { _id: '$aspirante_id' } }, { $count: 'total' }],
          carreras: [{ $group: { _id: '$carrera_objetivo' } }, { $count: 'total' }],
          materias: [{ $group: { _id: '$materia' } }, { $count: 'total' }],
          municipios: [{ $group: { _id: { d: '$departamento', m: '$municipio' } } }, { $count: 'total' }],
        },
      },
    ])
    .toArray();

  const t = resultado.totales[0] || { evaluaciones: 0, aprobadas: 0, edad_promedio: null };
  res.json({
    evaluaciones: t.evaluaciones,
    aprobadas: t.aprobadas,
    porcentaje_aprobacion: t.evaluaciones ? +((t.aprobadas / t.evaluaciones) * 100).toFixed(2) : 0,
    edad_promedio: t.edad_promedio ? +t.edad_promedio.toFixed(2) : null,
    aspirantes: resultado.aspirantes[0]?.total || 0,
    carreras: resultado.carreras[0]?.total || 0,
    materias: resultado.materias[0]?.total || 0,
    municipios: resultado.municipios[0]?.total || 0,
  });
});

const COLECCIONES_CONSOLA = ['evaluaciones', 'aspirantes', 'resumen_carrera', 'cargas', 'registros_rechazados'];
const ETAPAS_PROHIBIDAS = ['$out', '$merge'];

// Consola de solo lectura
router.post('/consola', async (req, res) => {
  const { coleccion } = req.body || {};
  // EJSON acepta fechas como {"$date": "..."}
  const pipeline = BSON.EJSON.deserialize(req.body?.pipeline ?? null);
  if (!COLECCIONES_CONSOLA.includes(coleccion)) {
    throw new AppError(400, `Colección no permitida. Use: ${COLECCIONES_CONSOLA.join(', ')}`);
  }
  if (!Array.isArray(pipeline)) throw new AppError(400, 'El pipeline debe ser un arreglo de etapas');
  const etapas = pipeline.flatMap((e) => Object.keys(e || {}));
  const prohibida = etapas.find((e) => ETAPAS_PROHIBIDAS.includes(e));
  if (prohibida) throw new AppError(400, `La etapa ${prohibida} no está permitida en la consola`);

  const inicio = Date.now();
  let datos;
  try {
    datos = await getDb()
      .collection(coleccion)
      .aggregate([...pipeline, { $limit: 1000 }], { allowDiskUse: true, maxTimeMS: 30000 })
      .toArray();
  } catch (err) {
    if (err.name === 'MongoServerError') throw new AppError(400, 'Error en el pipeline', err.message);
    throw err;
  }
  res.json({ duracion_ms: Date.now() - inicio, datos });
});

module.exports = router;
