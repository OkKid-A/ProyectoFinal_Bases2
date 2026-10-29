const { Router } = require('express');
const { getDb } = require('../db/mongo');
const { AppError } = require('../middleware/errors');

const router = Router();

// Escapa caracteres especiales de expresiones regulares
const escaparRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizar = (v) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toUpperCase();

router.get('/busqueda', async (req, res) => {
  const q = req.query;
  const filtro = {};

  const aspirante = String(q.aspirante ?? '').trim().toLowerCase();
  if (aspirante) {
    if (!/^[a-z0-9]+$/.test(aspirante)) throw new AppError(400, 'El correlativo sólo puede contener letras y números');
    filtro.aspirante_id = { $regex: '^' + aspirante };
  }

  // Texto libre: coincidencia parcial
  const camposTexto = {
    carrera: 'carrera_objetivo',
    materia: 'materia',
    municipio: 'municipio',
  };
  for (const [param, campo] of Object.entries(camposTexto)) {
    const valor = normalizar(q[param]);
    if (valor) filtro[campo] = { $regex: escaparRegex(valor) };
  }

  // Listas: valor exacto
  const camposExactos = {
    departamento: 'departamento',
    tipo: 'tipo_institucion',
  };
  for (const [param, campo] of Object.entries(camposExactos)) {
    const valor = normalizar(q[param]);
    if (valor) filtro[campo] = valor;
  }

  if (q.resultado) {
    const r = normalizar(q.resultado);
    if (!['APROBADO', 'NO APROBADO'].includes(r)) throw new AppError(400, 'Resultado inválido');
    filtro.aprobacion = r;
  }
  if (q.anio) {
    if (!/^\d{4}$/.test(q.anio)) throw new AppError(400, 'El año debe tener 4 dígitos');
    filtro.anio_de_ingreso = Number(q.anio);
  }
  if (q.sexo) filtro.sexo = normalizar(q.sexo);

  const pagina = Math.max(1, Number(q.pagina) || 1);
  const limite = Math.min(200, Math.max(1, Number(q.limite) || 25));
  const col = getDb().collection('evaluaciones');

  const inicio = Date.now();
  const [total, registros] = await Promise.all([
    col.countDocuments(filtro),
    col
      .find(filtro, { projection: { carga_id: 0 } })
      .sort({ aspirante_id: 1, fecha_asignacion: 1 })
      .skip((pagina - 1) * limite)
      .limit(limite)
      .toArray(),
  ]);

  res.json({ total, pagina, limite, filtro, duracion_ms: Date.now() - inicio, registros });
});

router.get('/catalogos', async (req, res) => {
  const col = getDb().collection('evaluaciones');
  const distintos = (campo) => col.distinct(campo).then((v) => v.filter((x) => x !== null).sort());
  const [anios, materias, carreras, departamentos, tipos, sexos, municipios] = await Promise.all([
    distintos('anio_de_ingreso'),
    distintos('materia'),
    distintos('carrera_objetivo'),
    distintos('departamento'),
    distintos('tipo_institucion'),
    distintos('sexo'),
    col
      .aggregate([
        { $group: { _id: { departamento: '$departamento', municipio: '$municipio' } } },
        { $project: { _id: 0, departamento: '$_id.departamento', municipio: '$_id.municipio' } },
        { $sort: { departamento: 1, municipio: 1 } },
      ])
      .toArray(),
  ]);
  res.json({ anios, materias, carreras, departamentos, tipos, sexos, municipios });
});

module.exports = router;
