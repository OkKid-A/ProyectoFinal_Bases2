import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import Alerta from './Alerta';
import ErrorBoundary from './ErrorBoundary';
import Grafica from './Grafica';
import Tabla from './Tabla';

export default function TarjetaConsulta({ consulta, filtros, ancha, renderPersonalizado }) {
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [vista, setVista] = useState('grafica');
  const [params, setParams] = useState(() =>
    Object.fromEntries((consulta.params || []).map((p) => [p.nombre, p.defecto ?? '']))
  );

  const requiereEntrada = (consulta.params || []).some((p) => p.requerido);

  const ejecutar = useCallback(
    async (extra = params) => {
      setCargando(true);
      setError(null);
      try {
        setResultado(await api.ejecutarMongo(consulta.id, { ...filtros, ...extra }));
      } catch (e) {
        setError(e);
        setResultado(null);
      } finally {
        setCargando(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [consulta.id, filtros]
  );

  useEffect(() => {
    if (!requiereEntrada) ejecutar();
  }, [ejecutar, requiereEntrada]);

  const vistas = consulta.viz.tipo === 'tabla' ? ['tabla', 'pipeline'] : ['grafica', 'tabla', 'pipeline'];
  const vistaActual = vistas.includes(vista) ? vista : vistas[0];

  return (
    <section className={`tarjeta ${ancha ? 'ancha' : ''}`}>
      <header className="tarjeta-encabezado">
        <div>
          <span className="numero">{consulta.id}</span>
          <h3>{consulta.titulo}</h3>
          <p className="muted">{consulta.descripcion}</p>
        </div>
        <div className="pestanas">
          {vistas.map((v) => (
            <button key={v} className={vistaActual === v ? 'activa' : ''} onClick={() => setVista(v)}>
              {v === 'grafica' ? 'Gráfica' : v === 'tabla' ? 'Datos' : 'Consulta'}
            </button>
          ))}
        </div>
      </header>

      {consulta.params?.length > 0 && (
        <form
          className="tarjeta-params"
          onSubmit={(e) => {
            e.preventDefault();
            ejecutar(params);
          }}
        >
          {consulta.params.map((p) => (
            <label key={p.nombre}>
              {p.etiqueta}
              <input
                value={params[p.nombre]}
                onChange={(e) => setParams({ ...params, [p.nombre]: e.target.value })}
                placeholder={p.requerido ? 'Obligatorio' : ''}
              />
            </label>
          ))}
          <button className="btn" disabled={cargando}>
            Consultar
          </button>
        </form>
      )}

      <div className="tarjeta-cuerpo">
        {cargando && <div className="cargando">Ejecutando consulta…</div>}
        <Alerta error={error} />
        {resultado && !cargando && (
          <ErrorBoundary>
            {vistaActual === 'grafica' &&
              (renderPersonalizado ? renderPersonalizado(resultado.datos) : <Grafica viz={consulta.viz} datos={resultado.datos} />)}
            {vistaActual === 'tabla' && <Tabla filas={resultado.datos} porPagina={10} />}
            {vistaActual === 'pipeline' && (
              <pre className="codigo">
                {`db.${resultado.coleccion}.aggregate(${JSON.stringify(resultado.pipeline, null, 2)})`}
              </pre>
            )}
            <p className="pie muted">
              {resultado.datos.length} resultado(s) · {resultado.duracion_ms} ms · colección {resultado.coleccion}
            </p>
          </ErrorBoundary>
        )}
      </div>
    </section>
  );
}
