const express = require('express');
const cors = require('cors');
const config = require('./config');
const { conectarMongo, cerrarMongo } = require('./db/mongo');
const { conectarNeo4j, cerrarNeo4j } = require('./db/neo4j');
const { errorHandler, notFound } = require('./middleware/errors');

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '2mb' }));

app.use('/api/salud', require('./routes/salud'));
app.use('/api/cargas', require('./routes/cargas'));
app.use('/api/mongo', require('./routes/mongo'));
app.use('/api/grafo', require('./routes/grafo'));
app.use('/api', require('./routes/busqueda'));

app.use(notFound);
app.use(errorHandler);

async function iniciar() {
  await conectarMongo().catch((err) => console.error('[MongoDB] No disponible al iniciar:', err.message));
  await conectarNeo4j().catch((err) => console.error('[Neo4j] No disponible al iniciar:', err.message));

  const server = app.listen(config.port, () => {
    console.log(`[API] Escuchando en http://localhost:${config.port}`);
  });
  // Sin límite de tiempo para cargas grandes
  server.requestTimeout = 0;
  server.headersTimeout = 0;
  server.timeout = 0;

  const apagar = async () => {
    console.log('\n[API] Cerrando conexiones...');
    server.close();
    await Promise.allSettled([cerrarMongo(), cerrarNeo4j()]);
    process.exit(0);
  };
  process.on('SIGINT', apagar);
  process.on('SIGTERM', apagar);
}

process.on('unhandledRejection', (err) => console.error('[API] Promesa rechazada sin manejar:', err));

iniciar();
