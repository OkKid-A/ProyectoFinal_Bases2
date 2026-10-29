const { MongoClient } = require('mongodb');
const config = require('../config');

const client = new MongoClient(config.mongo.uri, {
  serverSelectionTimeoutMS: 5000,
});

let db = null;

async function conectarMongo() {
  await client.connect();
  db = client.db(config.mongo.db);
  await crearIndices();
  console.log(`[MongoDB] Conectado a la base "${config.mongo.db}"`);
  return db;
}

function getDb() {
  return db || client.db(config.mongo.db);
}

async function crearIndices() {
  const ev = getDb().collection('evaluaciones');
  await Promise.all([
    ev.createIndex({ aspirante_id: 1, fecha_asignacion: 1 }),
    ev.createIndex({ materia: 1, aprobado: 1 }),
    ev.createIndex({ carrera_objetivo: 1, anio_de_ingreso: 1 }),
    ev.createIndex({ tipo_institucion: 1 }),
    ev.createIndex({ departamento: 1, municipio: 1 }),
    ev.createIndex({ carga_id: 1 }),
    getDb().collection('registros_rechazados').createIndex({ carga_id: 1, linea: 1 }),
    getDb().collection('aspirantes').createIndex({ carrera_objetivo: 1 }),
  ]);
}

async function pingMongo() {
  await getDb().command({ ping: 1 });
  return true;
}

async function cerrarMongo() {
  await client.close();
}

module.exports = { conectarMongo, getDb, pingMongo, cerrarMongo };
