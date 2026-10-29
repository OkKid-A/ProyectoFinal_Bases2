class AppError extends Error {
  constructor(status, mensaje, detalle) {
    super(mensaje);
    this.status = status;
    this.detalle = detalle;
  }
}

function esErrorDeConexion(err) {
  const nombre = err?.name || '';
  const codigo = err?.code || '';
  return (
    nombre.startsWith('MongoServerSelection') ||
    nombre === 'MongoNetworkError' ||
    nombre === 'MongoNotConnectedError' ||
    codigo === 'ServiceUnavailable' ||
    codigo === 'SessionExpired' ||
    codigo === 'ECONNREFUSED' ||
    /connection acquisition timed out|failed to connect to server/i.test(err?.message || '')
  );
}

function traducirErrorNeo4j(err) {
  if (err?.name !== 'Neo4jError') return null;
  const codigo = err.code || '';
  const mensaje = err.message || '';
  if (/shortest path algorithm does not work when the start and end nodes are the same/i.test(mensaje)) {
    return { status: 400, error: 'El camino más corto necesita dos nodos distintos: el origen y el destino son el mismo' };
  }
  if (codigo === 'Neo.ClientError.Statement.SyntaxError') {
    return { status: 400, error: 'Error de sintaxis en la consulta Cypher', detalle: mensaje };
  }
  if (codigo === 'Neo.ClientError.Statement.ParameterMissing') {
    return { status: 400, error: 'Falta un parámetro requerido por la consulta Cypher', detalle: mensaje };
  }
  if (codigo === 'Neo.ClientError.Statement.AccessMode' || /write operations are not allowed/i.test(mensaje)) {
    return { status: 400, error: 'La consola sólo permite consultas de lectura (MATCH … RETURN)' };
  }
  if (codigo === 'Neo.ClientError.Security.Unauthorized') {
    return { status: 503, error: 'Usuario o contraseña de Neo4j incorrectos' };
  }
  if (codigo.startsWith('Neo.ClientError.')) {
    return { status: 400, error: 'La consulta Cypher no es válida', detalle: mensaje };
  }
  return { status: 500, error: 'Neo4j no pudo ejecutar la consulta', detalle: mensaje };
}

function notFound(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, detalle: err.detalle });
  }
  if (err?.name === 'MulterError') {
    return res.status(400).json({ error: 'Error al recibir el archivo', detalle: err.message });
  }
  if (esErrorDeConexion(err)) {
    console.error('[DB] Error de conexión:', err.message);
    const base = err?.name?.startsWith('Mongo') ? 'MongoDB' : 'Neo4j';
    return res.status(503).json({
      error: `No fue posible conectar con ${base}`,
      detalle: `Verifique que el servicio esté en ejecución (docker compose start ${base === 'MongoDB' ? 'mongo' : 'neo4j'}).`,
    });
  }
  const neo4jError = traducirErrorNeo4j(err);
  if (neo4jError) {
    const { status, ...cuerpo } = neo4jError;
    return res.status(status).json(cuerpo);
  }
  console.error('[API] Error no controlado:', err);
  res.status(500).json({ error: 'Error interno al procesar la solicitud', detalle: err?.message });
}

module.exports = { AppError, errorHandler, notFound, esErrorDeConexion };
