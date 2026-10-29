// Consultas Cypher — generado automáticamente con "npm run docs".
// En Neo4j Browser defina primero los parámetros, por ejemplo:
//   :param aspirante => '949d241ac10256edf11339a303c72a50'
//   :param aspirante2 => '<otro correlativo>'
//   :param departamento => 'GUATEMALA'
//   :param carrera => 'INGENIERIA CIVIL'
//   :param min_reprobadas => 2
//   :param materia => null
//   :param anio => null

// 1. Red de relaciones de un aspirante
// Recorre desde un aspirante hacia las materias que evaluó, la carrera a la que aspira y su institución, municipio y departamento.
MATCH (a:Aspirante {id: $aspirante})
MATCH p1 = (a)-[:EVALUADO_EN]->(:Materia)
MATCH p2 = (a)-[:ASPIRA_A]->(:Carrera)
MATCH p3 = (a)-[:PROVIENE_DE]->(:Institucion)-[:UBICADA_EN]->(:Municipio)-[:PERTENECE_A]->(:Departamento)
OPTIONAL MATCH p4 = (a)-[:PROVIENE_DE]->(:Institucion)-[:ES_DE_TIPO]->(:TipoInstitucion)
RETURN p1, p2, p3, p4;

// 2. Aspirantes con el mismo perfil (institución y carrera)
// Encuentra otros aspirantes que provienen de la misma institución (tipo + municipio) y aspiran a la misma carrera que el aspirante dado, junto con las materias que aprobaron.
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
LIMIT 50;

// 3. Carreras demandadas desde un departamento
// Recorrido Departamento ← Municipio ← Institución ← Aspirante → Carrera para contar cuántos aspirantes de un departamento aspiran a cada carrera y desde cuántos municipios.
MATCH (d:Departamento {nombre: $departamento})<-[:PERTENECE_A]-(mu:Municipio)
      <-[:UBICADA_EN]-(:Institucion)<-[:PROVIENE_DE]-(a:Aspirante)-[:ASPIRA_A]->(c:Carrera)
WHERE c.nombre <> 'NINGUNO'
RETURN c.nombre AS carrera,
       count(DISTINCT a) AS aspirantes,
       count(DISTINCT mu) AS municipios
ORDER BY aspirantes DESC;

// 4. Materias críticas para una carrera
// Para los aspirantes de una carrera, calcula por materia el promedio de intentos, cuántos acumulan N o más reprobaciones y qué porcentaje logró aprobar. Filtra por propiedades de la relación EVALUADO_EN.
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
ORDER BY aspirantes_con_n_reprobaciones DESC;

// 5. Aspirantes que aprobaron después de reprobar
// Busca aspirantes que reprobaron una materia y posteriormente la aprobaron (comparando la fecha de las relaciones), agrupados por tipo de institución y materia.
MATCH (a:Aspirante)-[r1:EVALUADO_EN]->(m:Materia)<-[r2:EVALUADO_EN]-(a)
WHERE r1.aprobado = false AND r2.aprobado = true AND r1.fecha < r2.fecha
  AND ($materia IS NULL OR m.nombre = $materia)
WITH a, m, count(DISTINCT r1) AS reprobadas_previas
MATCH (a)-[:PROVIENE_DE]->(i:Institucion)
RETURN i.tipo AS tipo_institucion,
       m.nombre AS materia,
       count(DISTINCT a) AS aspirantes,
       round(avg(reprobadas_previas), 2) AS promedio_reprobaciones_previas
ORDER BY aspirantes DESC;

// 6. Camino más corto entre dos aspirantes
// Usa shortestPath para encontrar cómo se conectan dos aspirantes a través de materias, carreras, instituciones o ubicaciones compartidas.
MATCH (a:Aspirante {id: $aspirante}), (b:Aspirante {id: $aspirante2})
MATCH p = shortestPath((a)-[*..8]-(b))
RETURN p;

// 7. Tasa de aprobación por departamento y tipo de institución
// Recorre Aspirante → Institución → Municipio → Departamento y calcula el porcentaje de evaluaciones aprobadas por tipo de institución en cada departamento.
MATCH (a:Aspirante)-[e:EVALUADO_EN]->(:Materia)
WHERE $anio IS NULL OR e.anio_ingreso = $anio
MATCH (a)-[:PROVIENE_DE]->(i:Institucion)-[:UBICADA_EN]->(:Municipio)-[:PERTENECE_A]->(d:Departamento)
WITH d.nombre AS departamento, i.tipo AS tipo_institucion,
     count(e) AS evaluaciones,
     sum(CASE WHEN e.aprobado THEN 1 ELSE 0 END) AS aprobadas
RETURN departamento, tipo_institucion, evaluaciones, aprobadas,
       round(100.0 * aprobadas / evaluaciones, 2) AS porcentaje_aprobacion
ORDER BY departamento, porcentaje_aprobacion DESC;

