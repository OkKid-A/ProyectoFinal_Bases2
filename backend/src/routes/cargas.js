const fs = require('fs');
const path = require('path');
const { Router } = require('express');
const multer = require('multer');
const { ObjectId } = require('mongodb');
const { getDb } = require('../db/mongo');
const { driver } = require('../db/neo4j');
const { procesarArchivo } = require('../etl/loader');
const { AppError } = require('../middleware/errors');

const router = Router();

const DIR_UPLOADS = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(DIR_UPLOADS, { recursive: true });

const upload = multer({
  dest: DIR_UPLOADS,
  limits: { fileSize: 500 * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) => {
    // Nombre del archivo en UTF-8
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      return cb(new AppError(400, `El archivo "${file.originalname}" no es un CSV`));
    }
    cb(null, true);
  },
});

router.post('/', upload.array('archivos', 20), async (req, res) => {
  if (!req.files?.length) throw new AppError(400, 'Debe seleccionar al menos un archivo CSV');

  const resultados = [];
  for (const archivo of req.files) {
    const resumen = await procesarArchivo(archivo.path, archivo.originalname);
    resultados.push(resumen);
    fs.promises.unlink(archivo.path).catch(() => {});
  }
  res.json({ resultados });
});

router.get('/', async (req, res) => {
  const cargas = await getDb().collection('cargas').find().sort({ fecha_inicio: -1 }).limit(100).toArray();
  res.json(cargas);
});

router.get('/:id/rechazados', async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) throw new AppError(400, 'Identificador de carga inválido');
  const cargaId = new ObjectId(req.params.id);
  const pagina = Math.max(1, Number(req.query.pagina) || 1);
  const limite = Math.min(200, Math.max(1, Number(req.query.limite) || 50));
  const col = getDb().collection('registros_rechazados');
  const [total, registros] = await Promise.all([
    col.countDocuments({ carga_id: cargaId }),
    col
      .find({ carga_id: cargaId })
      .sort({ linea: 1 })
      .skip((pagina - 1) * limite)
      .limit(limite)
      .toArray(),
  ]);
  res.json({ total, pagina, limite, registros });
});

router.delete('/datos', async (req, res) => {
  if (req.query.confirmar !== 'si') throw new AppError(400, 'Debe confirmar la operación con ?confirmar=si');
  const db = getDb();
  await Promise.all(
    ['evaluaciones', 'aspirantes', 'resumen_carrera', 'cargas', 'registros_rechazados'].map((c) =>
      db.collection(c).deleteMany({})
    )
  );
  // Borrado por lotes
  const session = driver.session();
  try {
    await session.run('MATCH (n) CALL (n) { DETACH DELETE n } IN TRANSACTIONS OF 10000 ROWS');
  } finally {
    await session.close();
  }
  res.json({ ok: true, mensaje: 'Datos eliminados de MongoDB y Neo4j' });
});

module.exports = router;
