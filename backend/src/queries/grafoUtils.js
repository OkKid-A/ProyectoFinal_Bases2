// Convierte resultados de Neo4j en { nodos, enlaces }
const { neo4j } = require('../db/neo4j');

function valorPlano(v) {
  if (v === null || v === undefined) return v;
  if (neo4j.isDate(v) || neo4j.isDateTime(v) || neo4j.isLocalDateTime(v)) return v.toString();
  if (Array.isArray(v)) return v.map(valorPlano);
  return v;
}

function propiedadesPlanas(props) {
  const out = {};
  for (const [k, v] of Object.entries(props)) out[k] = valorPlano(v);
  return out;
}

function etiquetaNodo(tipo, props) {
  if (tipo === 'Aspirante') return props.id?.slice(0, 8) ?? 'aspirante';
  return props.nombre ?? props.clave ?? props.id ?? tipo;
}

function convertirGrafo(registros) {
  const nodos = new Map();
  const enlaces = new Map();

  const agregarNodo = (n) => {
    if (nodos.has(n.elementId)) return;
    const tipo = n.labels[0];
    const props = propiedadesPlanas(n.properties);
    nodos.set(n.elementId, { id: n.elementId, tipo, etiqueta: etiquetaNodo(tipo, props), propiedades: props });
  };

  // Relaciones repetidas entre los mismos nodos se unen en un enlace
  const agregarRelacion = (r) => {
    const clave = `${r.startNodeElementId}|${r.endNodeElementId}|${r.type}`;
    const props = propiedadesPlanas(r.properties);
    const existente = enlaces.get(clave);
    if (existente) {
      if (!existente.ids.has(r.elementId)) {
        existente.ids.add(r.elementId);
        existente.cantidad += 1;
        existente.aprobado = existente.aprobado || props.aprobado === true;
        existente.detalle.push(props);
      }
      return;
    }
    enlaces.set(clave, {
      source: r.startNodeElementId,
      target: r.endNodeElementId,
      tipo: r.type,
      cantidad: 1,
      aprobado: props.aprobado,
      detalle: [props],
      ids: new Set([r.elementId]),
    });
  };

  const visitar = (v) => {
    if (v === null || v === undefined) return;
    if (Array.isArray(v)) return v.forEach(visitar);
    if (neo4j.isNode(v)) return agregarNodo(v);
    if (neo4j.isRelationship(v)) return agregarRelacion(v);
    if (neo4j.isPath(v)) {
      agregarNodo(v.start);
      for (const s of v.segments) {
        agregarNodo(s.start);
        agregarNodo(s.end);
        agregarRelacion(s.relationship);
      }
    }
  };

  for (const reg of registros) for (const v of Object.values(reg)) visitar(v);

  return {
    nodos: [...nodos.values()],
    enlaces: [...enlaces.values()].map(({ ids, ...resto }) => resto),
  };
}

function convertirTabla(registros) {
  return registros.map((r) => propiedadesPlanas(r));
}

module.exports = { convertirGrafo, convertirTabla };
