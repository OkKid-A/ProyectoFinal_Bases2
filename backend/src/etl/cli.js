// Uso: npm run cargar -- archivo1.csv archivo2.csv
const path = require('path');
const { conectarMongo, cerrarMongo } = require('../db/mongo');
const { conectarNeo4j, cerrarNeo4j } = require('../db/neo4j');
const { procesarArchivo } = require('./loader');

async function main() {
  const archivos = process.argv.slice(2);
  if (!archivos.length) {
    console.error('Uso: npm run cargar -- <archivo.csv> [otro.csv ...]');
    process.exit(1);
  }
  await conectarMongo();
  await conectarNeo4j();
  for (const archivo of archivos) {
    console.log(`\nProcesando ${archivo}...`);
    const r = await procesarArchivo(path.resolve(archivo), path.basename(archivo));
    console.table({
      archivo: r.archivo,
      leidos: r.total_leidos,
      procesados: r.procesados,
      insertados: r.insertados,
      duplicados: r.duplicados,
      rechazados: r.rechazados,
      'tiempo (s)': (r.duracion_ms / 1000).toFixed(2),
      estado: r.estado,
    });
    if (r.mensaje) console.log('Mensaje:', r.mensaje);
    if (Object.keys(r.causas_rechazo).length) console.log('Causas de rechazo:', r.causas_rechazo);
  }
  await Promise.allSettled([cerrarMongo(), cerrarNeo4j()]);
}

main().catch(async (err) => {
  console.error('Error:', err.message);
  await Promise.allSettled([cerrarMongo(), cerrarNeo4j()]);
  process.exit(1);
});
