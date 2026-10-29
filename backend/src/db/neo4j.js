const neo4j = require('neo4j-driver');
const config = require('../config');

const driver = neo4j.driver(
  config.neo4j.uri,
  neo4j.auth.basic(config.neo4j.user, config.neo4j.password),
  {
    disableLosslessIntegers: true,
    connectionTimeout: 5000,
    connectionAcquisitionTimeout: 5000,
    maxTransactionRetryTime: 3000,
  }
);

// Restricciones de unicidad
const RESTRICCIONES = [
  'CREATE CONSTRAINT aspirante_id IF NOT EXISTS FOR (a:Aspirante) REQUIRE a.id IS UNIQUE',
  'CREATE CONSTRAINT carrera_nombre IF NOT EXISTS FOR (c:Carrera) REQUIRE c.nombre IS UNIQUE',
  'CREATE CONSTRAINT materia_nombre IF NOT EXISTS FOR (m:Materia) REQUIRE m.nombre IS UNIQUE',
  'CREATE CONSTRAINT departamento_nombre IF NOT EXISTS FOR (d:Departamento) REQUIRE d.nombre IS UNIQUE',
  'CREATE CONSTRAINT municipio_clave IF NOT EXISTS FOR (m:Municipio) REQUIRE m.clave IS UNIQUE',
  'CREATE CONSTRAINT tipo_nombre IF NOT EXISTS FOR (t:TipoInstitucion) REQUIRE t.nombre IS UNIQUE',
  'CREATE CONSTRAINT institucion_clave IF NOT EXISTS FOR (i:Institucion) REQUIRE i.clave IS UNIQUE',
  'CREATE INDEX evaluado_id IF NOT EXISTS FOR ()-[r:EVALUADO_EN]-() ON (r.id)',
];

async function conectarNeo4j() {
  await driver.verifyConnectivity();
  for (const q of RESTRICCIONES) {
    await driver.executeQuery(q);
  }
  console.log('[Neo4j] Conectado y restricciones verificadas');
}

async function ejecutarCypher(cypher, params = {}, modo = 'READ') {
  const { records } = await driver.executeQuery(cypher, params, {
    routing: modo === 'WRITE' ? neo4j.routing.WRITE : neo4j.routing.READ,
  });
  return records.map((r) => r.toObject());
}

async function pingNeo4j() {
  await driver.verifyConnectivity();
  return true;
}

async function cerrarNeo4j() {
  await driver.close();
}

module.exports = { driver, neo4j, conectarNeo4j, ejecutarCypher, pingNeo4j, cerrarNeo4j };
