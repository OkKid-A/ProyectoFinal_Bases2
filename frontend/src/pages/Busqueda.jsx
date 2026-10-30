import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmt } from '../api';
import { SelectCatalogo, useCatalogos } from '../catalogos';
import Alerta from '../components/Alerta';

const VACIO = {
  aspirante: '',
  carrera: '',
  materia: '',
  municipio: '',
  departamento: '',
  tipo: '',
  resultado: '',
  anio: '',
  sexo: '',
};

const COLUMNAS = [
  ['aspirante_id', 'Aspirante'],
  ['fecha_asignacion', 'Fecha'],
  ['materia', 'Materia'],
  ['intento', 'Oport.'],
  ['aprobacion', 'Resultado'],
  ['carrera_objetivo', 'Carrera'],
  ['anio_de_ingreso', 'Ingreso'],
  ['tipo_institucion', 'Tipo inst.'],
  ['municipio', 'Municipio'],
  ['departamento', 'Departamento'],
  ['sexo', 'Sexo'],
  ['edad', 'Edad'],
];

export default function Busqueda() {
  const cat = useCatalogos();
  const [filtros, setFiltros] = useState(VACIO);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  const buscar = async (pagina = 1) => {
    setCargando(true);
    setError(null);
    try {
      setResultado(await api.buscar({ ...filtros, pagina, limite: 25 }));
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  };

  const set = (k) => (v) => setFiltros((f) => ({ ...f, [k]: v }));
  const texto = (k, etiqueta, ph) => (
    <label>
      {etiqueta}
      <input value={filtros[k]} onChange={(e) => set(k)(e.target.value)} placeholder={ph} />
    </label>
  );

  const totalPaginas = resultado ? Math.max(1, Math.ceil(resultado.total / resultado.limite)) : 1;

  return (
    <div>
      <p className="descripcion-pagina">
            Busque evaluaciones combinando criterios. Los campos de texto aceptan coincidencias parciales (p. ej. “sistemas”,
            “zona 1”).
          </p>
      <form
        className="barra-filtros tarjeta"
        onSubmit={(e) => {
          e.preventDefault();
          buscar(1);
        }}
      >
        {texto('aspirante', 'Aspirante (correlativo)', 'inicio del correlativo')}
        {texto('carrera', 'Carrera objetivo', 'p. ej. civil')}
        {texto('materia', 'Materia', 'p. ej. matematica')}
        {texto('municipio', 'Municipio', 'p. ej. mixco')}
        <label>
          Departamento
          <SelectCatalogo valores={cat.departamentos} value={filtros.departamento} onChange={set('departamento')} />
        </label>
        <label>
          Tipo de institución
          <SelectCatalogo valores={cat.tipos} value={filtros.tipo} onChange={set('tipo')} />
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
          Sexo
          <SelectCatalogo valores={cat.sexos} value={filtros.sexo} onChange={set('sexo')} />
        </label>
        <button className="btn" disabled={cargando}>
          {cargando ? 'Buscando…' : 'Buscar'}
        </button>
        <button
          type="button"
          className="btn btn-sec"
          onClick={() => {
            setFiltros(VACIO);
            setResultado(null);
          }}
        >
          Limpiar
        </button>
      </form>

      <Alerta error={error} />

      {resultado && (
        <section className="tarjeta">
          <p>
            <strong>{fmt(resultado.total)}</strong> evaluaciones encontradas ({resultado.duracion_ms} ms)
          </p>
          {resultado.registros.length === 0 ? (
            <p className="vacio">No hay coincidencias con los criterios indicados.</p>
          ) : (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead>
                  <tr>
                    {COLUMNAS.map(([, t]) => (
                      <th key={t}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultado.registros.map((r) => (
                    <tr key={r._id}>
                      <td>
                        <Link to={`/aspirante/${r.aspirante_id}`} title="Ver historial">
                          {r.aspirante_id.slice(0, 12)}…
                        </Link>
                      </td>
                      <td>{String(r.fecha_asignacion).slice(0, 10)}</td>
                      <td>{r.materia}</td>
                      <td>{r.intento}</td>
                      <td>
                        <span className={`etiqueta ${r.aprobado ? 'ok' : 'mal'}`}>{r.aprobacion}</span>
                      </td>
                      <td>{r.carrera_objetivo}</td>
                      <td>{r.anio_de_ingreso}</td>
                      <td>{r.tipo_institucion}</td>
                      <td>{r.municipio}</td>
                      <td>{r.departamento}</td>
                      <td>{r.sexo}</td>
                      <td>{r.edad ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {resultado.total > resultado.limite && (
            <div className="paginacion">
              <button className="btn btn-sec" disabled={resultado.pagina === 1 || cargando} onClick={() => buscar(resultado.pagina - 1)}>
                ‹ Anterior
              </button>
              <span>
                Página {resultado.pagina} de {fmt(totalPaginas)}
              </span>
              <button
                className="btn btn-sec"
                disabled={resultado.pagina >= totalPaginas || cargando}
                onClick={() => buscar(resultado.pagina + 1)}
              >
                Siguiente ›
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
