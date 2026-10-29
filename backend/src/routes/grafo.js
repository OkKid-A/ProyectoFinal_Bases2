const { Router } = require('express');
const { driver, neo4j, ejecutarCypher } = require('../db/neo4j');
const { consultasCypher, CYPHER_EXPLORADOR, CYPHER_ESTADISTICAS } = require('../queries/cypherQueries');
const { convertirGrafo, convertirTabla } = require('../queries/grafoUtils');
const { AppError } = require('../middleware/errors');

const router = Router();

const texto = (v) => {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
};
const entero = (v) => {
  const s = texto(v);
  if (s === null) return null;
  if (!/^-?\d+$/.test(s)) throw new AppError(400, `Valor numérico inválido: "${s}"`);
  return parseInt(s, 10);
};

router.get('/consultas', (req, res) => {
  res.json(consultasCypher);
});

router.get('/consultas/:id', async (req, res) => {
  const consulta = consultasCypher.find((c) => c.id === req.params.id);
  if (!consulta) throw new AppError(404, `No existe la consulta ${req.params.id}`);

  const params = {};
  for (const p of consulta.params) {
    let valor = p.tipo === 'numero' ? entero(req.query[p.nombre]) : texto(req.query[p.nombre]);
    if (valor === null && p.defecto !== undefined) valor = p.defecto;
    if (p.requerido && valor === null) throw new AppError(400, `El parámetro "${p.etiqueta}" es obligatorio`);
    if (typeof valor === 'string') valor = p.nombre.startsWith('aspirante') ? valor.toLowerCase() : valor.toUpperCase();
    params[p.nombre] = valor;
  }
  if (consulta.id === 'camino-aspirantes' && params.aspirante === params.aspirante2) {
    throw new AppError(400, 'El aspirante origen y el aspirante destino deben ser diferentes');
  }

  const inicio = Date.now();
  const registros = await ejecutarCypher(consulta.cypher, params);
  const datos = consulta.resultado === 'grafo' ? convertirGrafo(registros) : convertirTabla(registros);
  res.json({ consulta, params, duracion_ms: Date.now() - inicio, datos });
});

router.get('/explorar', async (req, res) => {
  const resultado = texto(req.query.resultado)?.toUpperCase() ?? null;
  if (resultado && !['APROBADO', 'NO APROBADO'].includes(resultado)) {
    throw new AppError(400, 'El resultado debe ser APROBADO o NO APROBADO');
  }
  const params = {
    carrera: texto(req.query.carrera)?.toUpperCase() ?? null,
    departamento: texto(req.query.departamento)?.toUpperCase() ?? null,
    municipio: texto(req.query.municipio)?.toUpperCase() ?? null,
    tipo: texto(req.query.tipo)?.toUpperCase() ?? null,
    materia: texto(req.query.materia)?.toUpperCase() ?? null,
    resultado,
    anio: entero(req.query.anio),
    // LIMIT necesita un entero
    limite: neo4j.int(Math.min(300, Math.max(1, entero(req.query.limite) ?? 40))),
  };
  const inicio = Date.now();
  const registros = await ejecutarCypher(CYPHER_EXPLORADOR, params);
  res.json({
    cypher: CYPHER_EXPLORADOR,
    params: { ...params, limite: params.limite.toNumber() },
    duracion_ms: Date.now() - inicio,
    datos: convertirGrafo(registros),
  });
});

router.get('/estadisticas', async (req, res) => {
  res.json(await ejecutarCypher(CYPHER_ESTADISTICAS));
});

// Consola de solo lectura
router.post('/consola', async (req, res) => {
  const cypher = texto(req.body?.cypher);
  if (!cypher) throw new AppError(400, 'Debe escribir una consulta Cypher');
  const params = req.body?.params && typeof req.body.params === 'object' ? req.body.params : {};

  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  const inicio = Date.now();
  try {
    const resultado = await session.executeRead((tx) => tx.run(cypher, params), { timeout: 30000 });
    const registros = resultado.records.slice(0, 1000).map((r) => r.toObject());
    const grafo = convertirGrafo(registros);
    res.json({
      duracion_ms: Date.now() - inicio,
      columnas: resultado.records[0]?.keys ?? [],
      tabla: grafo.nodos.length ? null : convertirTabla(registros),
      grafo: grafo.nodos.length ? grafo : null,
    });
  } finally {
    await session.close();
  }
});

module.exports = router;
