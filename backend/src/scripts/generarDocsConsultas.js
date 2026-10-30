// Genera los archivos de consultas (npm run docs)
const fs = require('fs');
const path = require('path');
const { consultas } = require('../queries/mongoQueries');
const { consultasCypher } = require('../queries/cypherQueries');

const RAIZ = path.join(__dirname, '..', '..', '..');
const EJEMPLO_ASPIRANTE = '949d241ac10256edf11339a303c72a50';

const json = (v) => JSON.stringify(v, null, 2);
const paramsEjemplo = (c) =>
  Object.fromEntries((c.params || []).map((p) => [p.nombre, p.nombre === 'aspirante' ? EJEMPLO_ASPIRANTE : p.defecto]));

let script = `// Consultas de MongoDB — generado automáticamente con "npm run docs".
// Ejecutar en mongosh:  mongosh "mongodb://admin:admin123@localhost:27017/usac_pruebas?authSource=admin" consultas/mongodb_consultas.js
// o copiar cada consulta individualmente.

db = db.getSiblingDB('usac_pruebas');

`;

for (const c of consultas) {
  const pipeline = c.pipeline(paramsEjemplo(c));
  script += `// ${c.id}. ${c.titulo}\n// ${c.descripcion}\nprint('--- ${c.id}. ${c.titulo.replace(/'/g, "\\'")}');\n`;
  script += `printjson(db.${c.coleccion}.aggregate(${json(pipeline)}).toArray());\n\n`;
}

let cypherScript = `// Consultas Cypher — generado automáticamente con "npm run docs".
// En Neo4j Browser defina primero los parámetros, por ejemplo:
//   :param aspirante => '${EJEMPLO_ASPIRANTE}'
//   :param aspirante2 => '<otro correlativo>'
//   :param departamento => 'GUATEMALA'
//   :param carrera => 'INGENIERIA CIVIL'
//   :param min_reprobadas => 2
//   :param materia => null
//   :param anio => null

`;

consultasCypher.forEach((c, i) => {
  cypherScript += `// ${i + 1}. ${c.titulo}\n// ${c.descripcion}\n${c.cypher.trim()};\n\n`;
});

fs.mkdirSync(path.join(RAIZ, 'consultas'), { recursive: true });
fs.writeFileSync(path.join(RAIZ, 'consultas', 'mongodb_consultas.js'), script);
fs.writeFileSync(path.join(RAIZ, 'consultas', 'neo4j_consultas.cypher'), cypherScript);
console.log('Archivos de consultas generados en consultas/.');
