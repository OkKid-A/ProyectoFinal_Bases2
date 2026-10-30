import { useEffect, useRef, useState } from 'react';
import { api, fmt } from '../api';
import { useCatalogos } from '../catalogos';
import Alerta from '../components/Alerta';
import Tabla from '../components/Tabla';
import TarjetaKpi from '../components/TarjetaKpi';

const segundos = (ms) => (ms === undefined ? '—' : `${(ms / 1000).toFixed(2)} s`);
const claseEstado = (e) => (e === 'COMPLETADO' ? 'ok' : e === 'FALLIDO' ? 'mal' : 'aviso');

function ResumenCarga({ r }) {
  return (
    <div className="resumen-carga">
      <div className="resumen-titulo">
        <strong>📄 {r.archivo}</strong>
        <span className={`etiqueta ${claseEstado(r.estado)}`}>{r.estado}</span>
      </div>
      {r.mensaje && <Alerta>{r.mensaje}</Alerta>}
      <div className="kpis">
        <TarjetaKpi compacta valor={fmt(r.total_leidos)} titulo="Registros Leídos" subtitulo="Filas del archivo" />
        <TarjetaKpi compacta tono="ok" valor={fmt(r.procesados)} titulo="Procesados" subtitulo="Registros válidos" />
        <TarjetaKpi compacta tono={r.rechazados ? 'mal' : ''} valor={fmt(r.rechazados)} titulo="Rechazados" subtitulo="Registros con errores" />
        <TarjetaKpi compacta valor={`${fmt(r.insertados)} / ${fmt(r.duplicados)}`} titulo="Nuevos / Duplicados" subtitulo="Repetidos en el archivo o ya cargados" />
        <TarjetaKpi compacta valor={fmt(r.con_advertencias)} titulo="Con Advertencias" subtitulo="Conservados con ajustes" />
        <TarjetaKpi compacta valor={segundos(r.duracion_ms)} titulo="Tiempo" subtitulo="Duración del proceso" />
      </div>
      {Object.keys(r.causas_rechazo || {}).length > 0 && (
        <p>
          <strong>Causas de rechazo: </strong>
          {Object.entries(r.causas_rechazo)
            .map(([c, n]) => `${c} (${fmt(n)})`)
            .join(' · ')}
        </p>
      )}
      {Object.keys(r.advertencias_por_tipo || {}).length > 0 && (
        <p className="muted">
          <strong>Advertencias (registro conservado): </strong>
          {Object.entries(r.advertencias_por_tipo)
            .map(([c, n]) => `${c} (${fmt(n)})`)
            .join(' · ')}
        </p>
      )}
      {r.encoding && (
        <p className="muted">
          Codificación detectada: {r.encoding} · delimitador: “{r.delimitador === '\t' ? 'TAB' : r.delimitador}”
        </p>
      )}
      {r.rechazados > 0 && <TablaRechazados carga={r} />}
    </div>
  );
}

function TablaRechazados({ carga, porPagina = 10 }) {
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    api.rechazados(carga._id, { pagina, limite: porPagina }).then(setDatos, setError);
  }, [carga._id, pagina]);

  const filas = (datos?.registros || []).map((r) => ({
    linea: r.linea,
    causas: r.errores.join(' | '),
    registro: r.datos ? Object.values(r.datos).join(', ') : '—',
  }));
  const totalPaginas = datos ? Math.ceil(datos.total / datos.limite) : 1;

  return (
    <div className="rechazados">
      <h4>Registros rechazados</h4>
      <Alerta error={error} />
      {datos && (
        <>
          <Tabla filas={filas} porPagina={porPagina} />
          {datos.total > 0 && (
            <div className="paginacion">
              <button className="btn btn-sec" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>
                ‹
              </button>
              <span>
                Página {pagina} de {totalPaginas} ({fmt(datos.total)} registros)
              </span>
              <button className="btn btn-sec" disabled={pagina >= totalPaginas} onClick={() => setPagina(pagina + 1)}>
                ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Rechazados({ carga, onCerrar }) {
  return (
    <section className="tarjeta">
      <div className="resumen-titulo">
        <h3>Registros rechazados — {carga.archivo}</h3>
        <button className="btn btn-sec" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
      <TablaRechazados carga={carga} />
    </section>
  );
}

export default function Carga() {
  const { recargar } = useCatalogos();
  const input = useRef(null);
  const [archivos, setArchivos] = useState([]);
  const [arrastrando, setArrastrando] = useState(false);
  const [progreso, setProgreso] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [error, setError] = useState(null);
  const [verRechazados, setVerRechazados] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const cargarHistorial = () => api.cargas().then(setHistorial, setError);
  useEffect(() => {
    cargarHistorial();
  }, []);

  const agregar = (lista) => {
    const nuevos = [...lista];
    const invalidos = nuevos.filter((f) => !f.name.toLowerCase().endsWith('.csv'));
    if (invalidos.length) setError(new Error(`Sólo se permiten archivos .csv: ${invalidos.map((f) => f.name).join(', ')}`));
    else setError(null);
    setArchivos((prev) => [...prev, ...nuevos.filter((f) => f.name.toLowerCase().endsWith('.csv'))]);
  };

  const subir = async () => {
    setError(null);
    setMensaje(null);
    setResultados([]);
    setProgreso(0);
    try {
      const r = await api.subirArchivos(archivos, setProgreso);
      setResultados(r.resultados);
      setArchivos([]);
      recargar();
      cargarHistorial();
    } catch (e) {
      setError(e);
    } finally {
      setProgreso(null);
    }
  };

  const eliminarTodo = async () => {
    if (!window.confirm('¿Eliminar TODOS los datos de MongoDB y Neo4j? Esta acción no se puede deshacer.')) return;
    try {
      const r = await api.eliminarDatos();
      setMensaje(r.mensaje);
      setResultados([]);
      recargar();
      cargarHistorial();
    } catch (e) {
      setError(e);
    }
  };

  return (
    <div>
      <p className="descripcion-pagina">
            Suba uno o varios CSV del dataset “Pruebas específicas”. Cada archivo se valida, se transforma y se almacena en
            MongoDB y Neo4j.
          </p>

      <section className="tarjeta">
        <div
          className={`zona-carga ${arrastrando ? 'activa' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            agregar(e.dataTransfer.files);
          }}
          onClick={() => input.current?.click()}
        >
          <p>
            <strong>Arrastre aquí sus archivos CSV</strong> o haga clic para seleccionarlos
          </p>
          <input
            ref={input}
            type="file"
            accept=".csv,text/csv"
            multiple
            hidden
            onChange={(e) => {
              agregar(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {archivos.length > 0 && (
          <ul className="lista-archivos">
            {archivos.map((f, i) => (
              <li key={i}>
                {f.name} <span className="muted">({fmt(f.size / 1024, 1)} KB)</span>
                <button
                  className="enlace"
                  disabled={progreso !== null}
                  onClick={() => setArchivos(archivos.filter((_, j) => j !== i))}
                >
                  quitar
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="acciones">
          <button className="btn" disabled={!archivos.length || progreso !== null} onClick={subir}>
            Cargar {archivos.length > 0 ? `${archivos.length} archivo(s)` : ''}
          </button>
          <button className="btn btn-peligro" onClick={eliminarTodo} disabled={progreso !== null}>
            Eliminar todos los datos
          </button>
        </div>

        {progreso !== null && (
          <div className="progreso">
            <div className="barra">
              <div style={{ width: `${progreso}%` }} />
            </div>
            <span>
              {progreso < 100
                ? `Enviando archivos… ${progreso}%`
                : 'Procesando registros en el servidor (validación, MongoDB y Neo4j)…'}
            </span>
          </div>
        )}
        <Alerta error={error} />
        {mensaje && <Alerta tipo="ok">{mensaje}</Alerta>}
      </section>

      {resultados.length > 0 && (
        <section className="tarjeta">
          <h3>Resultado de la carga</h3>
          {resultados.map((r) => (
            <ResumenCarga key={r._id} r={r} />
          ))}
        </section>
      )}

      {verRechazados && <Rechazados carga={verRechazados} onCerrar={() => setVerRechazados(null)} />}

      <section className="tarjeta">
        <h3>Historial de cargas</h3>
        <Tabla
          filas={historial.map((h) => ({
            fecha: new Date(h.fecha_inicio).toLocaleString('es-GT'),
            archivo: h.archivo,
            leidos: h.total_leidos,
            procesados: h.procesados,
            rechazados: h.rechazados,
            tiempo: segundos(h.duracion_ms),
            estado: h.estado,
            _carga: h,
          }))}
          columnas={['fecha', 'archivo', 'leidos', 'procesados', 'rechazados', 'tiempo', 'estado']}
          render={{
            estado: (v) => <span className={`etiqueta ${claseEstado(v)}`}>{v}</span>,
            rechazados: (v, f) =>
              v > 0 ? (
                <button className="enlace" onClick={() => setVerRechazados(f._carga)}>
                  {fmt(v)}
                </button>
              ) : (
                fmt(v)
              ),
          }}
          porPagina={10}
        />
      </section>
    </div>
  );
}
