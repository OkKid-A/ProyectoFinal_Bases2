// Reglas de limpieza y validación de cada registro
const crypto = require('crypto');

const COLUMNAS_REQUERIDAS = [
  'fecha_asignacion',
  'sexo',
  'anio_nacimiento',
  'materia',
  'numero_de_fecha_de_evaluacion',
  'anio_de_ingreso',
  'aprobacion',
  'carrera_objetivo',
  'departamento_institucion_educativa',
  'municipio_institucion_educativa',
  'tipo_institucion_educativa',
  'correlativo_aspirante',
];

const SIN_REGISTRO = 'SIN REGISTRO';
const VALORES_VACIOS = new Set(['', 'NULL', 'NA', 'N/A', 'NAN', 'NONE', '-', SIN_REGISTRO]);

const EDAD_MIN = 12;
const EDAD_MAX = 80;
const ANIO_ACTUAL = new Date().getFullYear();

const MAPA_SEXO = { M: 'M', MASCULINO: 'M', HOMBRE: 'M', F: 'F', FEMENINO: 'F', MUJER: 'F' };
const MAPA_APROBACION = {
  APROBADO: 'APROBADO',
  APROBADA: 'APROBADO',
  'NO APROBADO': 'NO APROBADO',
  'NO APROBADA': 'NO APROBADO',
  REPROBADO: 'NO APROBADO',
  REPROBADA: 'NO APROBADO',
};
const MAPA_TIPO_INSTITUCION = {
  OFICIAL: 'PUBLICO',
  PUBLICA: 'PUBLICO',
  PUBLICO: 'PUBLICO',
  PRIVADA: 'PRIVADO',
  PRIVADO: 'PRIVADO',
};

// Encabezados recortados en algunos archivos
const ALIAS_ENCABEZADOS = {
  numero_de_fecha_de_evaluaci: 'numero_de_fecha_de_evaluacion',
  departamento_institucion_ed: 'departamento_institucion_educativa',
  municipio_institucion_: 'municipio_institucion_educativa',
};

function normalizarEncabezado(h) {
  const nombre = quitarAcentos(String(h ?? ''))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  return ALIAS_ENCABEZADOS[nombre] || nombre;
}

function quitarAcentos(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalizarTexto(valor) {
  if (valor === undefined || valor === null) return '';
  return quitarAcentos(String(valor).replace(/Ñ/g, '\u0000').replace(/ñ/g, '\u0000'))
    .replace(/\u0000/g, 'Ñ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

// "INGENIERIA MECANICA " con espacio al final puede ser Eléctrica o Industrial
const CARRERA_MECANICA_RECORTADA = 'INGENIERIA MECANICA (ELECTRICA O INDUSTRIAL)';
const CARRERAS_RECORTADAS = {
  'INGENIERIA EN CIENCIAS Y': 'INGENIERIA EN CIENCIAS Y SISTEMAS',
};

function normalizarCarrera(valor) {
  const texto = normalizarTexto(valor);
  if (texto === 'INGENIERIA MECANICA' && /\s$/.test(String(valor ?? ''))) return CARRERA_MECANICA_RECORTADA;
  return CARRERAS_RECORTADAS[texto] || texto;
}

function esVacio(texto) {
  return VALORES_VACIOS.has(texto);
}

function aEntero(texto) {
  if (!/^-?\d+(\.0+)?$/.test(texto)) return null;
  return parseInt(texto, 10);
}

// Formatos: AAAA-MM-DD, DD/MM/AAAA y DD-MM-AAAA
function aFecha(texto) {
  let a, m, d;
  let match = texto.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) [, a, m, d] = match;
  else {
    match = texto.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (!match) return null;
    [, d, m, a] = match;
  }
  const fecha = new Date(Date.UTC(+a, +m - 1, +d));
  if (fecha.getUTCFullYear() !== +a || fecha.getUTCMonth() !== +m - 1 || fecha.getUTCDate() !== +d) {
    return null;
  }
  return fecha;
}

function validarEncabezados(encabezados) {
  const normalizados = encabezados.map(normalizarEncabezado);
  const faltantes = COLUMNAS_REQUERIDAS.filter((c) => !normalizados.includes(c));
  return { valido: faltantes.length === 0, faltantes };
}

function transformarRegistro(fila) {
  const errores = [];
  const advertencias = [];
  const v = {};
  for (const col of COLUMNAS_REQUERIDAS) v[col] = normalizarTexto(fila[col]);
  v.carrera_objetivo = normalizarCarrera(fila.carrera_objetivo);

  const aspiranteId = String(fila.correlativo_aspirante ?? '').trim().toLowerCase();
  if (!aspiranteId || esVacio(aspiranteId.toUpperCase())) {
    errores.push('correlativo_aspirante vacío');
  } else if (!/^[a-z0-9]+$/.test(aspiranteId)) {
    errores.push(`correlativo_aspirante con caracteres inválidos: "${aspiranteId}"`);
  }

  const fecha = esVacio(v.fecha_asignacion) ? null : aFecha(v.fecha_asignacion);
  if (!fecha) errores.push(`fecha_asignacion inválida: "${fila.fecha_asignacion ?? ''}"`);

  if (esVacio(v.materia)) errores.push('materia vacía');

  const intento = aEntero(v.numero_de_fecha_de_evaluacion);
  if (intento === null || intento < 1) {
    errores.push(`numero_de_fecha_de_evaluacion inválido: "${fila.numero_de_fecha_de_evaluacion ?? ''}"`);
  }

  const anioIngreso = aEntero(v.anio_de_ingreso);
  if (anioIngreso === null || anioIngreso < 1990 || anioIngreso > ANIO_ACTUAL + 2) {
    errores.push(`anio_de_ingreso inválido: "${fila.anio_de_ingreso ?? ''}"`);
  }

  const aprobacion = MAPA_APROBACION[v.aprobacion];
  if (!aprobacion) errores.push(`aprobacion no reconocida: "${fila.aprobacion ?? ''}"`);

  if (errores.length) return { ok: false, errores };

  const sexo = MAPA_SEXO[v.sexo] || SIN_REGISTRO;
  if (sexo === SIN_REGISTRO && !esVacio(v.sexo)) advertencias.push(`sexo no reconocido: "${v.sexo}"`);

  let anioNacimiento = esVacio(v.anio_nacimiento) ? null : aEntero(v.anio_nacimiento);
  if (anioNacimiento !== null && (anioNacimiento < 1930 || anioNacimiento > ANIO_ACTUAL)) {
    advertencias.push(`anio_nacimiento fuera de rango: ${anioNacimiento}`);
    anioNacimiento = null;
  }

  let edad = anioNacimiento === null ? null : fecha.getUTCFullYear() - anioNacimiento;
  if (edad !== null && (edad < EDAD_MIN || edad > EDAD_MAX)) {
    advertencias.push(`edad improbable (${edad}); se almacena como null`);
    edad = null;
  }

  const carrera = esVacio(v.carrera_objetivo) ? 'NINGUNO' : v.carrera_objetivo;
  const departamento = esVacio(v.departamento_institucion_educativa) ? SIN_REGISTRO : v.departamento_institucion_educativa;
  const municipio = esVacio(v.municipio_institucion_educativa) ? SIN_REGISTRO : v.municipio_institucion_educativa;
  const tipoTexto = v.tipo_institucion_educativa;
  const tipo = esVacio(tipoTexto) ? SIN_REGISTRO : MAPA_TIPO_INSTITUCION[tipoTexto] || tipoTexto;

  const doc = {
    aspirante_id: aspiranteId,
    fecha_asignacion: fecha,
    mes_asignacion: fecha.getUTCMonth() + 1,
    sexo,
    anio_nacimiento: anioNacimiento,
    edad,
    materia: v.materia,
    intento,
    anio_de_ingreso: anioIngreso,
    aprobacion,
    aprobado: aprobacion === 'APROBADO',
    carrera_objetivo: carrera,
    departamento,
    municipio,
    tipo_institucion: tipo,
  };

  // Mismo registro = mismo _id
  doc._id = crypto
    .createHash('sha1')
    .update([aspiranteId, fecha.toISOString().slice(0, 10), v.materia, intento, anioIngreso, aprobacion].join('|'))
    .digest('hex');

  return { ok: true, doc, advertencias };
}

module.exports = {
  COLUMNAS_REQUERIDAS,
  SIN_REGISTRO,
  normalizarEncabezado,
  normalizarTexto,
  validarEncabezados,
  transformarRegistro,
};
