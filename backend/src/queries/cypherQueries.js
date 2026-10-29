// Consultas Cypher
const consultasCypher = [
  {
    id: 'red-aspirante',
    titulo: 'Red de relaciones de un aspirante',
    descripcion:
      'Recorre desde un aspirante hacia las materias que evaluó, la carrera a la que aspira y su institución, municipio y departamento.',
    params: [{ nombre: 'aspirante', etiqueta: 'Correlativo del aspirante', requerido: true }],
    resultado: 'grafo',
    cypher: `
MATCH (a:Aspirante {id: $aspirante})
MATCH p1 = (a)-[:EVALUADO_EN]->(:Materia)
MATCH p2 = (a)-[:ASPIRA_A]->(:Carrera)
MATCH p3 = (a)-[:PROVIENE_DE]->(:Institucion)-[:UBICADA_EN]->(:Municipio)-[:PERTENECE_A]->(:Departamento)
OPTIONAL MATCH p4 = (a)-[:PROVIENE_DE]->(:Institucion)-[:ES_DE_TIPO]->(:TipoInstitucion)
RETURN p1, p2, p3, p4`,
  },
  {
    id: 'companeros',
    titulo: 'Aspirantes con el mismo perfil (institución y carrera)',
    descripcion:
      'Encuentra otros aspirantes que provienen de la misma institución (tipo + municipio) y aspiran a la misma carrera que el aspirante dado, junto con las materias que aprobaron.',
    params: [{ nombre: 'aspirante', etiqueta: 'Correlativo del aspirante', requerido: true }],
    resultado: 'tabla',
    cypher: `
MATCH (a:Aspirante {id: $aspirante})-[:PROVIENE_DE]->(i:Institucion)<-[:PROVIENE_DE]-(otro:Aspirante),
      (a)-[:ASPIRA_A]->(c:Carrera)<-[:ASPIRA_A]-(otro)
OPTIONAL MATCH (otro)-[e:EVALUADO_EN]->(m:Materia)
WHERE e.aprobado = true
RETURN otro.id AS aspirante,
       i.nombre AS institucion,
       c.nombre AS carrera,
       count(DISTINCT m) AS materias_aprobadas,
       collect(DISTINCT m.nombre) AS materias
ORDER BY materias_aprobadas DESC, aspirante
LIMIT 50`,
  },
  {
    id: 'carreras-departamento',
    titulo: 'Carreras demandadas desde un departamento',
    descripcion:
      'Recorrido Departamento ← Municipio ← Institución ← Aspirante → Carrera para contar cuántos aspirantes de un departamento aspiran a cada carrera y desde cuántos municipios.',
    params: [{ nombre: 'departamento', etiqueta: 'Departamento', requerido: true, catalogo: 'departamentos' }],
    resultado: 'tabla',
    grafica: { x: 'carrera', y: 'aspirantes' },
    cypher: `
MATCH (d:Departamento {nombre: $departamento})<-[:PERTENECE_A]-(mu:Municipio)
      <-[:UBICADA_EN]-(:Institucion)<-[:PROVIENE_DE]-(a:Aspirante)-[:ASPIRA_A]->(c:Carrera)
WHERE c.nombre <> 'NINGUNO'
RETURN c.nombre AS carrera,
       count(DISTINCT a) AS aspirantes,
       count(DISTINCT mu) AS municipios
ORDER BY aspirantes DESC`,
  },
  {
    id: 'materias-criticas',
    titulo: 'Materias críticas para una carrera',
    descripcion:
      'Para los aspirantes de una carrera, calcula por materia el promedio de intentos, cuántos acumulan N o más reprobaciones y qué porcentaje logró aprobar. Filtra por propiedades de la relación EVALUADO_EN.',
    params: [
      { nombre: 'carrera', etiqueta: 'Carrera', requerido: true, catalogo: 'carreras' },
      { nombre: 'min_reprobadas', etiqueta: 'Mínimo de reprobaciones', defecto: 2, tipo: 'numero' },
    ],
    resultado: 'tabla',
    grafica: { x: 'materia', y: 'aspirantes_con_n_reprobaciones' },
    cypher: `
MATCH (:Carrera {nombre: $carrera})<-[:ASPIRA_A]-(a:Aspirante)-[e:EVALUADO_EN]->(m:Materia)
WITH m, a,
     count(e) AS intentos,
     sum(CASE WHEN e.aprobado THEN 0 ELSE 1 END) AS reprobadas,
     max(CASE WHEN e.aprobado THEN 1 ELSE 0 END) AS aprobo
RETURN m.nombre AS materia,
       count(a) AS aspirantes,
       round(avg(intentos), 2) AS promedio_intentos,
       sum(CASE WHEN reprobadas >= $min_reprobadas THEN 1 ELSE 0 END) AS aspirantes_con_n_reprobaciones,
       round(100.0 * sum(aprobo) / count(a), 2) AS porcentaje_aprobaron
ORDER BY aspirantes_con_n_reprobaciones DESC`,
  },
  {
    id: 'perseverancia',
    titulo: 'Aspirantes que aprobaron después de reprobar',
    descripcion:
      'Busca aspirantes que reprobaron una materia y posteriormente la aprobaron (comparando la fecha de las relaciones), agrupados por tipo de institución y materia.',
    params: [{ nombre: 'materia', etiqueta: 'Materia (opcional)', catalogo: 'materias' }],
    resultado: 'tabla',
    cypher: `
MATCH (a:Aspirante)-[r1:EVALUADO_EN]->(m:Materia)<-[r2:EVALUADO_EN]-(a)
WHERE r1.aprobado = false AND r2.aprobado = true AND r1.fecha < r2.fecha
  AND ($materia IS NULL OR m.nombre = $materia)
WITH a, m, count(DISTINCT r1) AS reprobadas_previas
MATCH (a)-[:PROVIENE_DE]->(i:Institucion)
RETURN i.tipo AS tipo_institucion,
       m.nombre AS materia,
       count(DISTINCT a) AS aspirantes,
       round(avg(reprobadas_previas), 2) AS promedio_reprobaciones_previas
ORDER BY aspirantes DESC`,
  },
  {
    id: 'camino-aspirantes',
    titulo: 'Camino más corto entre dos aspirantes',
    descripcion:
      'Usa shortestPath para encontrar cómo se conectan dos aspirantes a través de materias, carreras, instituciones o ubicaciones compartidas.',
    params: [
      { nombre: 'aspirante', etiqueta: 'Aspirante origen', requerido: true },
      { nombre: 'aspirante2', etiqueta: 'Aspirante destino', requerido: true },
    ],
    resultado: 'grafo',
    cypher: `
MATCH (a:Aspirante {id: $aspirante}), (b:Aspirante {id: $aspirante2})
MATCH p = shortestPath((a)-[*..8]-(b))
RETURN p`,
  },
  {
    id: 'tasa-tipo-departamento',
    titulo: 'Tasa de aprobación por departamento y tipo de institución',
    descripcion:
      'Recorre Aspirante → Institución → Municipio → Departamento y calcula el porcentaje de evaluaciones aprobadas por tipo de institución en cada departamento.',
    params: [{ nombre: 'anio', etiqueta: 'Año de ingreso (opcional)', tipo: 'numero', catalogo: 'anios' }],
    resultado: 'tabla',
    cypher: `
MATCH (a:Aspirante)-[e:EVALUADO_EN]->(:Materia)
WHERE $anio IS NULL OR e.anio_ingreso = $anio
MATCH (a)-[:PROVIENE_DE]->(i:Institucion)-[:UBICADA_EN]->(:Municipio)-[:PERTENECE_A]->(d:Departamento)
WITH d.nombre AS departamento, i.tipo AS tipo_institucion,
     count(e) AS evaluaciones,
     sum(CASE WHEN e.aprobado THEN 1 ELSE 0 END) AS aprobadas
RETURN departamento, tipo_institucion, evaluaciones, aprobadas,
       round(100.0 * aprobadas / evaluaciones, 2) AS porcentaje_aprobacion
ORDER BY departamento, porcentaje_aprobacion DESC`,
  },
];

// Explorador de grafos
const CYPHER_EXPLORADOR = `
MATCH (a:Aspirante)-[:ASPIRA_A]->(c:Carrera)
WHERE $carrera IS NULL OR c.nombre = $carrera
MATCH (a)-[:PROVIENE_DE]->(i:Institucion)-[:UBICADA_EN]->(mu:Municipio)-[:PERTENECE_A]->(d:Departamento)
WHERE ($departamento IS NULL OR d.nombre = $departamento)
  AND ($municipio IS NULL OR mu.nombre = $municipio)
  AND ($tipo IS NULL OR i.tipo = $tipo)
MATCH (a)-[e:EVALUADO_EN]->(m:Materia)
WHERE ($materia IS NULL OR m.nombre = $materia)
  AND ($resultado IS NULL OR e.resultado = $resultado)
  AND ($anio IS NULL OR e.anio_ingreso = $anio)
WITH DISTINCT a LIMIT $limite
MATCH p1 = (a)-[:ASPIRA_A]->(c:Carrera)
WHERE $carrera IS NULL OR c.nombre = $carrera
MATCH p2 = (a)-[:PROVIENE_DE]->(:Institucion)-[:UBICADA_EN]->(:Municipio)-[:PERTENECE_A]->(:Departamento)
MATCH p3 = (a)-[e:EVALUADO_EN]->(m:Materia)
WHERE ($materia IS NULL OR m.nombre = $materia)
  AND ($resultado IS NULL OR e.resultado = $resultado)
  AND ($anio IS NULL OR e.anio_ingreso = $anio)
RETURN p1, p2, collect(p3) AS evaluaciones`;

const CYPHER_ESTADISTICAS = `
CALL () {
  MATCH (n) RETURN 'nodo' AS clase, labels(n)[0] AS tipo, count(*) AS total
  UNION ALL
  MATCH ()-[r]->() RETURN 'relacion' AS clase, type(r) AS tipo, count(*) AS total
}
RETURN clase, tipo, total ORDER BY clase, total DESC`;

module.exports = { consultasCypher, CYPHER_EXPLORADOR, CYPHER_ESTADISTICAS };
