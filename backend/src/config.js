require('dotenv').config();

module.exports = {
  port: Number(process.env.PORT) || 3001,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  batchSize: Number(process.env.BATCH_SIZE) || 2000,
  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017',
    db: process.env.MONGO_DB || 'usac_pruebas',
  },
  neo4j: {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'password123',
  },
};
