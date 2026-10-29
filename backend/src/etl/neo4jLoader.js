// Carga un lote de evaluaciones en Neo4j. MERGE evita nodos y relaciones duplicados.
const { driver, neo4j } = require('../db/neo4j');

// Neo4j necesita enteros explícitos
const int = (v) => (v === null || v === undefined ? null : neo4j.int(v));

const CYPHER_CARGA = `
UNWIND $filas AS r
MERGE (a:Aspirante {id: r.aspirante_id})
  SET a.sexo = CASE WHEN a.sexo IS NULL OR a.sexo = 'SIN REGISTRO' THEN r.sexo ELSE a.sexo END,
      a.anio_nacimiento = coalesce(a.anio_nacimiento, r.anio_nacimiento)

MERGE (m:Materia {nombre: r.materia})
MERGE (a)-[e:EVALUADO_EN {id: r.id}]->(m)
  ON CREATE SET e.intento = r.intento,
                e.anio_ingreso = r.anio_de_ingreso,
                e.fecha = date(r.fecha),
                e.resultado = r.aprobacion,
                e.aprobado = r.aprobado,
                e.edad = r.edad

MERGE (c:Carrera {nombre: r.carrera_objetivo})
MERGE (a)-[asp:ASPIRA_A]->(c)
  ON CREATE SET asp.anios = [r.anio_de_ingreso]
  ON MATCH SET asp.anios = CASE WHEN r.anio_de_ingreso IN asp.anios
                                THEN asp.anios ELSE asp.anios + r.anio_de_ingreso END

MERGE (d:Departamento {nombre: r.departamento})
MERGE (mu:Municipio {clave: r.departamento + '|' + r.municipio})
  ON CREATE SET mu.nombre = r.municipio, mu.departamento = r.departamento
MERGE (mu)-[:PERTENECE_A]->(d)

MERGE (t:TipoInstitucion {nombre: r.tipo_institucion})
MERGE (i:Institucion {clave: r.tipo_institucion + '|' + r.departamento + '|' + r.municipio})
  ON CREATE SET i.nombre = r.tipo_institucion + ' - ' + r.municipio,
                i.tipo = r.tipo_institucion,
                i.municipio = r.municipio,
                i.departamento = r.departamento
MERGE (i)-[:ES_DE_TIPO]->(t)
MERGE (i)-[:UBICADA_EN]->(mu)
MERGE (a)-[:PROVIENE_DE]->(i)
`;

async function cargarLoteNeo4j(docs) {
  if (!docs.length) return;
  const filas = docs.map((d) => ({
    id: d._id,
    aspirante_id: d.aspirante_id,
    sexo: d.sexo,
    anio_nacimiento: int(d.anio_nacimiento),
    edad: int(d.edad),
    materia: d.materia,
    intento: int(d.intento),
    anio_de_ingreso: int(d.anio_de_ingreso),
    fecha: d.fecha_asignacion.toISOString().slice(0, 10),
    aprobacion: d.aprobacion,
    aprobado: d.aprobado,
    carrera_objetivo: d.carrera_objetivo,
    departamento: d.departamento,
    municipio: d.municipio,
    tipo_institucion: d.tipo_institucion,
  }));
  await driver.executeQuery(CYPHER_CARGA, { filas });
}

module.exports = { cargarLoteNeo4j, CYPHER_CARGA };
