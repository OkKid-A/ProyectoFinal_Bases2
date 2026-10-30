import { useState } from 'react';
import { api } from '../api';
import Alerta from '../components/Alerta';
import ErrorBoundary from '../components/ErrorBoundary';
import GrafoVisual from '../components/GrafoVisual';
import Tabla from '../components/Tabla';

const EJEMPLO_MONGO = `[
  { "$match": { "aprobado": true } },
  { "$group": { "_id": "$sexo", "aprobadas": { "$sum": 1 } } },
  { "$sort": { "aprobadas": -1 } }
]`;

const EJEMPLO_CYPHER = `MATCH (c:Carrera)<-[:ASPIRA_A]-(a:Aspirante)-[:PROVIENE_DE]->(i:Institucion)
WHERE i.tipo = 'PUBLICO'
RETURN c.nombre AS carrera, count(DISTINCT a) AS aspirantes
ORDER BY aspirantes DESC`;

export default function Consola() {
  const [coleccion, setColeccion] = useState('evaluaciones');
  const [pipeline, setPipeline] = useState(EJEMPLO_MONGO);
  const [resMongo, setResMongo] = useState(null);
  const [errMongo, setErrMongo] = useState(null);

  const [cypher, setCypher] = useState(EJEMPLO_CYPHER);
  const [resCypher, setResCypher] = useState(null);
  const [errCypher, setErrCypher] = useState(null);
  const [cargando, setCargando] = useState('');

  const ejecutarMongo = async () => {
    setErrMongo(null);
    setResMongo(null);
    let etapas;
    try {
      etapas = JSON.parse(pipeline);
    } catch (e) {
      return setErrMongo(Object.assign(new Error('El pipeline no es JSON válido'), { detalle: e.message }));
    }
    setCargando('mongo');
    try {
      setResMongo(await api.consolaMongo(coleccion, etapas));
    } catch (e) {
      setErrMongo(e);
    } finally {
      setCargando('');
    }
  };

  const ejecutarCypher = async () => {
    setErrCypher(null);
    setResCypher(null);
    setCargando('cypher');
    try {
      setResCypher(await api.consolaCypher(cypher));
    } catch (e) {
      setErrCypher(e);
    } finally {
      setCargando('');
    }
  };

  return (
    <div>
      <p className="descripcion-pagina">
            Escriba consultas nuevas sobre MongoDB (pipeline de agregación en JSON) o Neo4j (Cypher). Son de sólo lectura y
            se limitan a 1000 resultados.
          </p>
      <div className="grid-tarjetas">
        <section className="tarjeta ancha">
          <h3>MongoDB — aggregate</h3>
          <div className="barra-filtros">
            <label>
              Colección
              <select value={coleccion} onChange={(e) => setColeccion(e.target.value)}>
                {['evaluaciones', 'aspirantes', 'resumen_carrera', 'cargas', 'registros_rechazados'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <textarea className="editor" rows={10} value={pipeline} onChange={(e) => setPipeline(e.target.value)} spellCheck={false} />
          <button className="btn" onClick={ejecutarMongo} disabled={cargando === 'mongo'}>
            {cargando === 'mongo' ? 'Ejecutando…' : 'Ejecutar pipeline'}
          </button>
          <Alerta error={errMongo} />
          {resMongo && (
            <ErrorBoundary>
              <p className="pie muted">
                {resMongo.datos.length} documento(s) · {resMongo.duracion_ms} ms
              </p>
              <Tabla filas={resMongo.datos} />
            </ErrorBoundary>
          )}
        </section>

        <section className="tarjeta ancha">
          <h3>Neo4j — Cypher</h3>
          <textarea className="editor" rows={8} value={cypher} onChange={(e) => setCypher(e.target.value)} spellCheck={false} />
          <button className="btn" onClick={ejecutarCypher} disabled={cargando === 'cypher'}>
            {cargando === 'cypher' ? 'Ejecutando…' : 'Ejecutar Cypher'}
          </button>
          <p className="muted">Si la consulta devuelve nodos, relaciones o caminos (p. ej. RETURN p) se dibuja como grafo.</p>
          <Alerta error={errCypher} />
          {resCypher && (
            <ErrorBoundary>
              <p className="pie muted">{resCypher.duracion_ms} ms</p>
              {resCypher.grafo ? <GrafoVisual grafo={resCypher.grafo} alto={460} /> : <Tabla filas={resCypher.tabla} />}
            </ErrorBoundary>
          )}
        </section>
      </div>
    </div>
  );
}
