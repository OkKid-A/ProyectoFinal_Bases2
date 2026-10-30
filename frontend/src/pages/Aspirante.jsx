import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, fmt } from '../api';
import Alerta from '../components/Alerta';
import ErrorBoundary from '../components/ErrorBoundary';
import GrafoVisual from '../components/GrafoVisual';
import Tabla from '../components/Tabla';

const fecha = (f) => (f ? String(f).slice(0, 10) : '—');

// Consulta 11
export function HistorialMaterias({ materias }) {
  if (!materias?.length) return <p className="vacio">Sin evaluaciones.</p>;
  return (
    <div className="historial">
      {materias.map((m) => (
        <div key={m.materia} className={`historial-materia ${m.aprobada ? 'ok' : 'mal'}`}>
          <div className="historial-titulo">
            <strong>{m.materia}</strong>
            <span className={`etiqueta ${m.aprobada ? 'ok' : 'mal'}`}>{m.aprobada ? 'APROBADA' : 'NO APROBADA'}</span>
            <span className="muted">{m.intentos} intento(s)</span>
          </div>
          <ol className="linea-tiempo">
            {m.detalle.map((d, i) => (
              <li key={i} className={d.resultado === 'APROBADO' ? 'ok' : 'mal'}>
                <span>{fecha(d.fecha)}</span>
                <span>
                  Oportunidad {d.intento} · ingreso {d.anio_de_ingreso}
                </span>
                <strong>{d.resultado}</strong>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

// Consulta 15
export function PerfilAspirante({ aspirante: a }) {
  if (!a) return <p className="vacio">Aspirante no encontrado.</p>;
  const datos = [
    ['Correlativo', a._id],
    ['Sexo', a.sexo],
    ['Año de nacimiento', a.anio_nacimiento ?? 'SIN REGISTRO'],
    ['Edad (1.ª evaluación)', a.edad_primera_evaluacion ?? '—'],
    ['Carrera objetivo', a.carrera_objetivo],
    ['Carreras registradas', a.carreras?.join(', ')],
    ['Años de ingreso', a.anios_ingreso?.sort().join(', ')],
    ['Tipo de institución', a.tipo_institucion],
    ['Municipio', a.municipio],
    ['Departamento', a.departamento],
    ['Evaluaciones', `${fmt(a.total_evaluaciones)} (${fmt(a.total_aprobadas)} aprobadas)`],
    ['Materias aprobadas', a.materias_aprobadas?.join(', ') || 'Ninguna'],
    ['Primera / última evaluación', `${fecha(a.primera_evaluacion)} / ${fecha(a.ultima_evaluacion)}`],
  ];
  return (
    <div>
      <dl className="perfil">
        {datos.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <h4>Evaluaciones</h4>
      <Tabla
        filas={a.evaluaciones}
        columnas={['fecha', 'materia', 'intento', 'anio_de_ingreso', 'aprobacion', 'carrera_objetivo', 'edad']}
        porPagina={10}
      />
    </div>
  );
}

export default function Aspirante() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [entrada, setEntrada] = useState(id || '');
  const [estado, setEstado] = useState({ cargando: false });

  useEffect(() => {
    if (!id) return;
    setEntrada(id);
    setEstado({ cargando: true });
    Promise.allSettled([
      api.ejecutarMongo(15, { aspirante: id }),
      api.ejecutarMongo(11, { aspirante: id }),
      api.ejecutarCypher('red-aspirante', { aspirante: id }),
      api.ejecutarCypher('companeros', { aspirante: id }),
    ]).then(([perfil, historial, red, companeros]) => {
      const val = (r) => (r.status === 'fulfilled' ? r.value.datos : null);
      const err = (r) => (r.status === 'rejected' ? r.reason : null);
      setEstado({
        cargando: false,
        perfil: val(perfil)?.[0],
        historial: val(historial),
        red: val(red),
        companeros: val(companeros),
        errores: { perfil: err(perfil), historial: err(historial), red: err(red), companeros: err(companeros) },
      });
    });
  }, [id]);

  const e = estado.errores || {};

  return (
    <div>
      <p className="descripcion-pagina">Consultas 11 y 15 (MongoDB) y red de relaciones del aspirante (Neo4j).</p>
      <form
        className="barra-filtros"
        onSubmit={(ev) => {
          ev.preventDefault();
          const v = entrada.trim().toLowerCase();
          if (v) navegar(`/aspirante/${v}`);
        }}
      >
        <label className="crece">
          Correlativo del aspirante
          <input value={entrada} onChange={(ev) => setEntrada(ev.target.value)} placeholder="p. ej. 949d241ac10256edf11339a303c72a50" />
        </label>
        <button className="btn">Consultar</button>
        <span className="muted">
          ¿No conoce un correlativo? Use el <Link to="/busqueda">buscador</Link>.
        </span>
      </form>

      {estado.cargando && <div className="cargando">Consultando…</div>}

      {id && !estado.cargando && (
        <div className="grid-tarjetas">
          <section className="tarjeta">
            <h3>Información del aspirante (consulta 15)</h3>
            <Alerta error={e.perfil} />
            <ErrorBoundary>{estado.perfil && <PerfilAspirante aspirante={estado.perfil} />}</ErrorBoundary>
          </section>
          <section className="tarjeta">
            <h3>Desempeño por materia (consulta 11)</h3>
            <Alerta error={e.historial} />
            <ErrorBoundary>{estado.historial && <HistorialMaterias materias={estado.historial} />}</ErrorBoundary>
          </section>
          <section className="tarjeta ancha">
            <h3>Red del aspirante en Neo4j</h3>
            <p className="muted">Haga clic en un nodo o relación para ver sus propiedades.</p>
            <Alerta error={e.red} />
            <ErrorBoundary>{estado.red && <GrafoVisual grafo={estado.red} alto={420} />}</ErrorBoundary>
          </section>
          <section className="tarjeta ancha">
            <h3>Aspirantes con la misma institución y carrera (Neo4j)</h3>
            <Alerta error={e.companeros} />
            <ErrorBoundary>
              {estado.companeros && (
                <Tabla
                  filas={estado.companeros}
                  porPagina={10}
                  render={{ aspirante: (v) => <Link to={`/aspirante/${v}`}>{v}</Link> }}
                />
              )}
            </ErrorBoundary>
          </section>
        </div>
      )}
    </div>
  );
}
