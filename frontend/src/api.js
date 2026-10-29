async function solicitud(url, opciones = {}) {
  let res;
  try {
    res = await fetch(url, opciones);
  } catch {
    throw new Error('No se pudo conectar con el servidor (backend). Verifique que esté en ejecución.');
  }
  let cuerpo = null;
  try {
    cuerpo = await res.json();
  } catch {
    if (!res.ok) throw new Error(`El servidor respondió con error ${res.status}`);
  }
  if (!res.ok) {
    const err = new Error(cuerpo?.error || `Error ${res.status}`);
    err.detalle = cuerpo?.detalle;
    err.status = res.status;
    throw err;
  }
  return cuerpo;
}

const qs = (params = {}) => {
  const limpio = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
  );
  const s = new URLSearchParams(limpio).toString();
  return s ? `?${s}` : '';
};

const get = (url, params) => solicitud(url + qs(params));
const post = (url, body) =>
  solicitud(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const api = {
  salud: () =>
    fetch('/api/salud')
      .then((r) => r.json())
      .catch(() => new Error('No se pudo conectar con el servidor (backend)')),
  catalogos: () => get('/api/catalogos'),
  kpis: (params) => get('/api/mongo/kpis', params),
  consultasMongo: () => get('/api/mongo/consultas'),
  ejecutarMongo: (id, params) => get(`/api/mongo/consultas/${id}`, params),
  consolaMongo: (coleccion, pipeline) => post('/api/mongo/consola', { coleccion, pipeline }),
  consultasCypher: () => get('/api/grafo/consultas'),
  ejecutarCypher: (id, params) => get(`/api/grafo/consultas/${id}`, params),
  explorarGrafo: (params) => get('/api/grafo/explorar', params),
  estadisticasGrafo: () => get('/api/grafo/estadisticas'),
  consolaCypher: (cypher) => post('/api/grafo/consola', { cypher }),
  buscar: (params) => get('/api/busqueda', params),
  cargas: () => get('/api/cargas'),
  rechazados: (id, params) => get(`/api/cargas/${id}/rechazados`, params),
  eliminarDatos: () => solicitud('/api/cargas/datos?confirmar=si', { method: 'DELETE' }),

  // XMLHttpRequest permite mostrar el progreso
  subirArchivos(archivos, alProgreso) {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      for (const a of archivos) form.append('archivos', a);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/cargas');
      xhr.upload.onprogress = (e) => e.lengthComputable && alProgreso?.(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => {
        let cuerpo = null;
        try {
          cuerpo = JSON.parse(xhr.responseText);
        } catch {
          /* no es JSON */
        }
        if (xhr.status >= 200 && xhr.status < 300) return resolve(cuerpo);
        const err = new Error(cuerpo?.error || `Error ${xhr.status} al subir los archivos`);
        err.detalle = cuerpo?.detalle;
        reject(err);
      };
      xhr.onerror = () => reject(new Error('No se pudo conectar con el servidor para subir los archivos'));
      xhr.send(form);
    });
  },
};

export const fmt = (n, dec = 0) =>
  typeof n === 'number' ? n.toLocaleString('es-GT', { maximumFractionDigits: dec }) : n ?? '—';
