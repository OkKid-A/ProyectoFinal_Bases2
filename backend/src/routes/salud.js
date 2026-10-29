const { Router } = require('express');
const { pingMongo } = require('../db/mongo');
const { pingNeo4j } = require('../db/neo4j');

const router = Router();

const LIMITE_MS = 3000;

const conLimite = (promesa) =>
  Promise.race([
    promesa,
    new Promise((_, rechazar) => setTimeout(() => rechazar(new Error('sin respuesta')), LIMITE_MS)),
  ]);

router.get('/', async (req, res) => {
  const estado = async (nombre, fn) => {
    try {
      await conLimite(fn());
      return { ok: true };
    } catch (err) {
      return { ok: false, error: `No hay conexión con ${nombre}`, detalle: err.message };
    }
  };
  const [mongo, neo4j] = await Promise.all([estado('MongoDB', pingMongo), estado('Neo4j', pingNeo4j)]);
  res.status(mongo.ok && neo4j.ok ? 200 : 503).json({ api: { ok: true }, mongo, neo4j });
});

module.exports = router;
