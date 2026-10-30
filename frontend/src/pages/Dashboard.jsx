import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmt } from '../api';
import { useCatalogos } from '../catalogos';
import Alerta from '../components/Alerta';
import TarjetaConsulta from '../components/TarjetaConsulta';
import TarjetaKpi from '../components/TarjetaKpi';
import { HistorialMaterias, PerfilAspirante } from './Aspirante';

// Consultas a todo el ancho
const ANCHAS = new Set([3, 6, 7, 8, 9, 11, 15, 19, 20]);

function anchoPorConsulta(ids) {
  const anchas = new Set();
  let columna = 0;
  ids.forEach((id, i) => {
    const siguienteAncha = i === ids.length - 1 || ANCHAS.has(ids[i + 1]);
    if (ANCHAS.has(id) || (columna === 0 && siguienteAncha)) {
      anchas.add(id);
      columna = 0;
    } else {
      columna = (columna + 1) % 2;
    }
  });
  return anchas;
}

function Kpis({ filtros }) {
  const [kpis, setKpis] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    api.kpis(filtros).then(setKpis, setError);
  }, [filtros]);
  if (error) return <Alerta error={error} />;
  if (!kpis) return null;
  const items = [
    { valor: fmt(kpis.evaluaciones), titulo: 'Evaluaciones', subtitulo: 'Registros de evaluación procesados', a: '/busqueda', ayuda: 'Buscar evaluaciones' },
    { valor: fmt(kpis.aspirantes), titulo: 'Aspirantes', subtitulo: 'Correlativos distintos registrados', a: '/aspirante', ayuda: 'Consultar un aspirante' },
    { valor: fmt(kpis.aprobadas), titulo: 'Evaluaciones Aprobadas', subtitulo: 'Evaluaciones con resultado APROBADO', a: '/busqueda', ayuda: 'Buscar evaluaciones aprobadas' },
    { valor: `${fmt(kpis.porcentaje_aprobacion, 1)}%`, titulo: 'Tasa De Aprobación', subtitulo: 'Aprobadas sobre el total de evaluaciones' },
    { valor: fmt(kpis.edad_promedio, 1), titulo: 'Edad Promedio', subtitulo: 'Edad al momento de la evaluación' },
    { valor: fmt(kpis.carreras), titulo: 'Carreras Objetivo', subtitulo: 'Carreras distintas solicitadas', a: '/grafos', ayuda: 'Explorar carreras en el grafo' },
    { valor: fmt(kpis.materias), titulo: 'Materias Evaluadas', subtitulo: 'Materias de las pruebas específicas' },
    { valor: fmt(kpis.municipios), titulo: 'Municipios', subtitulo: 'Municipios de procedencia de los aspirantes', a: '/grafos', ayuda: 'Explorar ubicaciones en el grafo' },
  ];
  return (
    <>
      {kpis.evaluaciones === 0 && (
        <Alerta tipo="info">
          No hay datos cargados. Vaya a <Link to="/carga">Carga de archivos</Link> para subir los CSV.
        </Alerta>
      )}
      <div className="kpis">
        {items.map((k) => (
          <TarjetaKpi key={k.titulo} {...k} />
        ))}
      </div>
    </>
  );
}

export default function Dashboard() {
  const { anio } = useCatalogos();
  const [consultas, setConsultas] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.consultasMongo().then(setConsultas, setError);
  }, []);

  const filtros = useMemo(() => (anio ? { anio } : {}), [anio]);
  const ordenadas = [...consultas].sort((a, b) => a.id - b.id);
  const anchas = anchoPorConsulta(ordenadas.map((c) => c.id));

  const personalizados = {
    11: (datos) => <HistorialMaterias materias={datos} />,
    15: (datos) => <PerfilAspirante aspirante={datos[0]} />,
  };

  return (
    <div>
      <p className="descripcion-pagina">
        Resultados de las 20 consultas analíticas ejecutadas en MongoDB{anio ? ` · año de ingreso ${anio}` : ''}.
      </p>
      <Alerta error={error} />
      <Kpis filtros={filtros} />

      {ordenadas.length > 0 && (
        <div className="grid-tarjetas">
          {ordenadas.map((c) => (
            <TarjetaConsulta
              key={c.id}
              consulta={c}
              filtros={filtros}
              ancha={anchas.has(c.id)}
              renderPersonalizado={personalizados[c.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
