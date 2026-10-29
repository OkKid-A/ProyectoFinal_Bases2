// Proceso ETL de un archivo CSV
const fs = require('fs');
const { parse } = require('csv-parse');
const { ObjectId } = require('mongodb');
const config = require('../config');
const { getDb } = require('../db/mongo');
const { cargarLoteNeo4j } = require('./neo4jLoader');
const { normalizarEncabezado, validarEncabezados, transformarRegistro } = require('./transform');
const { regenerarAspirantes, generarResumenCarrera } = require('../queries/colecciones');

function inspeccionarArchivo(ruta) {
  const fd = fs.openSync(ruta, 'r');
  const buffer = Buffer.alloc(64 * 1024);
  const leidos = fs.readSync(fd, buffer, 0, buffer.length, 0);
  fs.closeSync(fd);
  const muestra = buffer.subarray(0, leidos);

  // Si no es UTF-8 válido se usa Latin-1
  const encoding = muestra.toString('utf8').includes('�') ? 'latin1' : 'utf8';
  const primeraLinea = muestra.toString(encoding).split(/\r?\n/)[0] || '';
  const candidatos = [',', ';', '\t', '|'];
  const delimiter = candidatos.reduce((mejor, c) =>
    primeraLinea.split(c).length > primeraLinea.split(mejor).length ? c : mejor
  );
  return { encoding, delimiter };
}

async function insertarLoteMongo(docs) {
  if (!docs.length) return { insertados: 0, duplicados: 0 };
  try {
    const res = await getDb().collection('evaluaciones').insertMany(docs, { ordered: false });
    return { insertados: res.insertedCount, duplicados: 0 };
  } catch (err) {
    const erroresEscritura = err.writeErrors ? [].concat(err.writeErrors) : null;
    if (!erroresEscritura) throw err;
    const noDuplicados = erroresEscritura.filter((e) => e.code !== 11000);
    if (noDuplicados.length) throw err;
    return {
      insertados: err.insertedCount ?? docs.length - erroresEscritura.length,
      duplicados: erroresEscritura.length,
    };
  }
}

async function procesarArchivo(ruta, nombreArchivo) {
  const inicio = Date.now();
  const db = getDb();
  const cargaId = new ObjectId();

  const resumen = {
    _id: cargaId,
    archivo: nombreArchivo,
    fecha_inicio: new Date(),
    total_leidos: 0,
    procesados: 0,
    insertados: 0,
    duplicados: 0,
    rechazados: 0,
    con_advertencias: 0,
    advertencias_por_tipo: {},
    causas_rechazo: {},
    estado: 'EN PROCESO',
    mensaje: null,
  };

  let loteValidos = [];
  let loteRechazados = [];

  const guardarLotes = async () => {
    if (loteValidos.length) {
      const docs = loteValidos;
      loteValidos = [];
      const { insertados, duplicados } = await insertarLoteMongo(docs);
      resumen.insertados += insertados;
      resumen.duplicados += duplicados;
      await cargarLoteNeo4j(docs);
    }
    if (loteRechazados.length) {
      const docs = loteRechazados;
      loteRechazados = [];
      await db.collection('registros_rechazados').insertMany(docs, { ordered: false });
    }
  };

  const rechazar = (linea, errores, datos) => {
    resumen.rechazados += 1;
    for (const e of errores) {
      const causa = e.split(':')[0];
      resumen.causas_rechazo[causa] = (resumen.causas_rechazo[causa] || 0) + 1;
    }
    loteRechazados.push({ carga_id: cargaId, archivo: nombreArchivo, linea, errores, datos });
  };

  try {
    await db.collection('cargas').insertOne(resumen);
    const { encoding, delimiter } = inspeccionarArchivo(ruta);
    resumen.encoding = encoding;
    resumen.delimitador = delimiter;

    let encabezadosValidados = false;
    const parser = fs.createReadStream(ruta, { encoding }).pipe(
      parse({
        delimiter,
        bom: true,
        columns: (encabezados) => {
          const { valido, faltantes } = validarEncabezados(encabezados);
          if (!valido) {
            const err = new Error(`Estructura inválida. Columnas faltantes: ${faltantes.join(', ')}`);
            err.estructura = true;
            throw err;
          }
          encabezadosValidados = true;
          return encabezados.map(normalizarEncabezado);
        },
        info: true,
        skip_empty_lines: true,
        relax_column_count: true,
        relax_quotes: true,
        skip_records_with_error: true,
      })
    );

    parser.on('skip', (err) => {
      resumen.total_leidos += 1;
      rechazar(err.lines, [`formato CSV inválido: ${err.message}`], err.record ?? null);
    });

    for await (const { record, info } of parser) {
      resumen.total_leidos += 1;
      const linea = info.lines;

      if (info.error) {
        rechazar(linea, [`cantidad de columnas incorrecta: ${info.error.message}`], record);
      } else {
        const r = transformarRegistro(record);
        if (r.ok) {
          r.doc.carga_id = cargaId;
          r.doc.archivo = nombreArchivo;
          loteValidos.push(r.doc);
          resumen.procesados += 1;
          if (r.advertencias.length) {
            resumen.con_advertencias += 1;
            for (const a of r.advertencias) {
              const tipo = a.split(/[:(]/)[0].trim();
              resumen.advertencias_por_tipo[tipo] = (resumen.advertencias_por_tipo[tipo] || 0) + 1;
            }
          }
        } else {
          rechazar(linea, r.errores, record);
        }
      }

      if (loteValidos.length >= config.batchSize || loteRechazados.length >= config.batchSize) {
        await guardarLotes();
      }
    }
    await guardarLotes();

    if (!encabezadosValidados) throw new Error('El archivo está vacío o no tiene encabezados');

    await regenerarAspirantes();
    await generarResumenCarrera();

    resumen.estado = resumen.rechazados > 0 ? 'COMPLETADO CON RECHAZOS' : 'COMPLETADO';
  } catch (err) {
    console.error(`[ETL] Error procesando ${nombreArchivo}:`, err.message);
    resumen.estado = 'FALLIDO';
    resumen.mensaje = err.estructura ? err.message : `Error durante la carga: ${err.message}`;
    try {
      await guardarLotes();
    } catch {
      /* sin conexión */
    }
  }

  resumen.fecha_fin = new Date();
  resumen.duracion_ms = Date.now() - inicio;
  try {
    await db.collection('cargas').replaceOne({ _id: cargaId }, resumen);
  } catch (err) {
    resumen.mensaje = (resumen.mensaje ? resumen.mensaje + ' | ' : '') + `No se pudo guardar el resumen: ${err.message}`;
  }
  return resumen;
}

module.exports = { procesarArchivo, inspeccionarArchivo };
