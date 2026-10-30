import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, fmt } from '../api';
import { SelectCatalogo, useCatalogos } from '../catalogos';
import Alerta from '../components/Alerta';
import ErrorBoundary from '../components/ErrorBoundary';
import GrafoVisual from '../components/GrafoVisual';
import TarjetaKpi from '../components/TarjetaKpi';
import Tabla from '../components/Tabla';

const FILTROS_INICIALES = {
  carrera: '',
  departamento: '',
  municipio: '',
  tipo: '',
  materia: '',
  resultado: '',
  anio: '',
  limite: '40',
};

function EstadisticasGrafo() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    api.estadisticasGrafo().then(setDatos, setError);
  }, []);
  if (error) return <Alerta error={error} />;
  if (!datos) return null;
  return (
    <div className="kpis">
      {datos.map((d) => (
        <TarjetaKpi
          key={d.clase + d.tipo}
          valor={fmt(d.total)}
          titulo={d.clase === 'nodo' ? `:${d.tipo}` : `[:${d.tipo}]`}
          subtitulo={d.clase === 'nodo' ? 'Nodos en Neo4j' : 'Relaciones en Neo4j'}
        />
      ))}
    </div>
  );
}

function Explorador() {
  const cat = useCatalogos();
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [verCypher, setVerCypher] = useState(false);

  const explorar = async (f = filtros) => {
    setCargando(true);
    setError(null);
    try {
      setResultado(await api.explorarGrafo(f));
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    explorar(FILTROS_INICIALES);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k) => (v) => setFiltros((f) => ({ ...f, [k]: v, ...(k === 'departamento' ? { municipio: '' } : {}) }));
  const municipios = cat.municipios
    .filter((m) => !filtros.departamento || m.departamento === filtros.departamento)
    .map((m) => m.municipio);

  return (
    <section className="tarjeta ancha">
      <h3>Explorador de grafos</h3>
      <p className="muted">
        Seleccione los filtros para elegir qué aspirantes mostrar junto con su carrera, materias evaluadas, institución,
        municipio y departamento.
      </p>
      <form
        className="barra-filtros"
        onSubmit={(e) => {
          e.preventDefault();
          explorar();
        }}
      >
        <label>
          Carrera
          <SelectCatalogo valores={cat.carreras} value={filtros.carrera} onChange={set('carrera')} />
        </label>
        <label>
          Departamento
          <SelectCatalogo valores={cat.departamentos} value={filtros.departamento} onChange={set('departamento')} />
        </label>
        <label>
          Municipio
          <SelectCatalogo valores={[...new Set(municipios)]} value={filtros.municipio} onChange={set('municipio')} />
        </label>
        <label>
          Tipo de institución
          <SelectCatalogo valores={cat.tipos} value={filtros.tipo} onChange={set('tipo')} />
        </label>
        <label>
          Materia
          <SelectCatalogo valores={cat.materias} value={filtros.materia} onChange={set('materia')} />
        </label>
        <label>
          Resultado
          <SelectCatalogo valores={['APROBADO', 'NO APROBADO']} value={filtros.resultado} onChange={set('resultado')} />
        </label>
        <label>
          Año de ingreso
          <SelectCatalogo valores={cat.anios.map(String)} value={filtros.anio} onChange={set('anio')} />
        </label>
        <label>
          Máx. aspirantes
          <input
            type="number"
            min="1"
            max="300"
            value={filtros.limite}
            onChange={(e) => set('limite')(e.target.value)}
            style={{ width: 90 }}
          />
        </label>
        <button className="btn" disabled={cargando}>
          {cargando ? 'Cargando…' : 'Aplicar filtros'}
        </button>
        <button
          type="button"
          className="btn btn-sec"
          onClick={() => {
            setFiltros(FILTROS_INICIALES);
            explorar(FILTROS_INICIALES);
          }}
        >
          Limpiar
        </button>
      </form>
      <Alerta error={error} />
      {resultado && (
        <ErrorBoundary>
          <GrafoVisual grafo={resultado.datos} />
          <p className="pie muted">
            {resultado.duracion_ms} ms ·{' '}
            <button className="enlace" onClick={() => setVerCypher(!verCypher)}>
              {verCypher ? 'Ocultar' : 'Ver'} consulta Cypher
            </button>
          </p>
          {verCypher && (
            <pre className="codigo">
              {resultado.cypher.trim()}
              {'\n\n// Parámetros\n'}
              {JSON.stringify(resultado.params, null, 2)}
            </pre>
          )}
        </ErrorBoundary>
      )}
    </section>
  );
}

function ConsultasCypher() {
  const cat = useCatalogos();
  const [consultas, setConsultas] = useState([]);
  const [seleccion, setSeleccion] = useState(null);
  const [params, setParams] = useState({});
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    api.consultasCypher().then((c) => {
      setConsultas(c);
      elegir(c[2]);
    }, setError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const elegir = (c) => {
    setSeleccion(c);
    setResultado(null);
    setError(null);
    setParams(Object.fromEntries(c.params.map((p) => [p.nombre, p.defecto ?? ''])));
  };

  const ejecutar = async () => {
    setCargando(true);
    setError(null);
    try {
      setResultado(await api.ejecutarCypher(seleccion.id, params));
    } catch (e) {
      setError(e);
      setResultado(null);
    } finally {
      setCargando(false);
    }
  };

  const campo = (p) => {
    const valor = params[p.nombre];
    const cambiar = (v) => setParams({ ...params, [p.nombre]: v });
    if (p.catalogo && cat[p.catalogo]?.length) {
      return (
        <SelectCatalogo
          valores={cat[p.catalogo].map(String)}
          value={valor}
          onChange={cambiar}
          todos={p.requerido ? 'Seleccione…' : 'Todos'}
        />
      );
    }
    return <input value={valor} onChange={(e) => cambiar(e.target.value)} placeholder={p.requerido ? 'Obligatorio' : ''} />;
  };

  return (
    <section className="tarjeta ancha">
      <h3>Consultas Cypher</h3>
      <div className="lista-consultas">
        {consultas.map((c, i) => (
          <button key={c.id} className={seleccion?.id === c.id ? 'activa' : ''} onClick={() => elegir(c)}>
            <span className="numero">{i + 1}</span> {c.titulo}
          </button>
        ))}
      </div>
      {seleccion && (
        <>
          <p>{seleccion.descripcion}</p>
          <pre className="codigo">{seleccion.cypher.trim()}</pre>
          <form
            className="barra-filtros"
            onSubmit={(e) => {
              e.preventDefault();
              ejecutar();
            }}
          >
            {seleccion.params.map((p) => (
              <label key={p.nombre} className={p.nombre.startsWith('aspirante') ? 'crece' : ''}>
                {p.etiqueta}
                {campo(p)}
              </label>
            ))}
            <button className="btn" disabled={cargando}>
              {cargando ? 'Ejecutando…' : 'Ejecutar'}
            </button>
            {seleccion.params.some((p) => p.nombre.startsWith('aspirante')) && (
              <span className="muted">
                Obtenga correlativos en el <Link to="/busqueda">buscador</Link>.
              </span>
            )}
          </form>
          <Alerta error={error} />
          {resultado && (
            <ErrorBoundary>
              {seleccion.resultado === 'grafo' ? (
                <GrafoVisual grafo={resultado.datos} alto={460} />
              ) : (
                <>
                  {seleccion.grafica && resultado.datos.length > 0 && (
                    <ResponsiveContainer width="100%" height={Math.max(240, resultado.datos.length * 28 + 40)}>
                      <BarChart data={resultado.datos} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey={seleccion.grafica.x} width={230} tick={{ fontSize: 11 }} interval={0} />
                        <Tooltip />
                        <Bar isAnimationActive={false} dataKey={seleccion.grafica.y} fill="#2a6fdb" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  <Tabla
                    filas={resultado.datos}
                    render={{ aspirante: (v) => <Link to={`/aspirante/${v}`}>{v}</Link> }}
                  />
                </>
              )}
              <p className="pie muted">{resultado.duracion_ms} ms</p>
            </ErrorBoundary>
          )}
        </>
      )}
    </section>
  );
}

export default function Grafos() {
  return (
    <div>
      <p className="descripcion-pagina">Relaciones entre aspirantes, carreras, materias, instituciones y ubicaciones en Neo4j.</p>
      <EstadisticasGrafo />
      <div className="grid-tarjetas">
        <Explorador />
        <ConsultasCypher />
      </div>
    </div>
  );
}
