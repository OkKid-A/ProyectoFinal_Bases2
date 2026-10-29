import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fmt } from '../api';
import Tabla from './Tabla';

export const PALETA = ['#2a6fdb', '#f28e2b', '#59a14f', '#e15759', '#76b7b2', '#b07aa1', '#edc948', '#9c755f', '#ff9da7', '#bab0ac'];

const formato = (sufijo) => (v) => `${fmt(v, 2)}${sufijo || ''}`;

// Una serie por cada valor distinto
function pivotear(datos, x, serie, y) {
  const series = [...new Set(datos.map((d) => String(d[serie])))].sort();
  const mapa = new Map();
  for (const d of datos) {
    const fila = mapa.get(d[x]) || { [x]: d[x] };
    fila[String(d[serie])] = d[y];
    mapa.set(d[x], fila);
  }
  return { filas: [...mapa.values()], series };
}

const sonEtiquetasLargas = (datos, x) => datos.some((d) => String(d[x] ?? '').length > 14);

function Barras({ datos, x, series, sufijo, apilar }) {
  const horizontal = sonEtiquetasLargas(datos, x);
  const alto = horizontal ? Math.max(260, datos.length * (series.length > 2 ? 34 : 26) + 60) : 300;
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart data={datos} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" />
        {horizontal ? (
          <>
            <XAxis type="number" tickFormatter={formato(sufijo)} />
            <YAxis type="category" dataKey={x} width={230} tick={{ fontSize: 11 }} interval={0} />
          </>
        ) : (
          <>
            <XAxis dataKey={x} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formato(sufijo)} />
          </>
        )}
        <Tooltip formatter={formato(sufijo)} />
        {series.length > 1 && <Legend />}
        {series.map((s, i) => (
          <Bar isAnimationActive={false} key={s} dataKey={s} fill={PALETA[i % PALETA.length]} stackId={apilar ? 'a' : undefined} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function Lineas({ datos, x, series, sufijo }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={datos} margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={x} tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={formato(sufijo)} />
        <Tooltip formatter={formato(sufijo)} />
        {series.length > 1 && <Legend />}
        {series.map((s, i) => (
          <Line isAnimationActive={false} key={s} type="monotone" dataKey={s} stroke={PALETA[i % PALETA.length]} strokeWidth={2} dot={{ r: 3 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function Pastel({ datos, x, y }) {
  const total = datos.reduce((s, d) => s + (d[y] || 0), 0);
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie isAnimationActive={false}
          data={datos}
          dataKey={y}
          nameKey={x}
          outerRadius={105}
          label={(d) => `${d[x]} (${((d[y] / total) * 100).toFixed(1)}%)`}
        >
          {datos.map((_, i) => (
            <Cell key={i} fill={PALETA[i % PALETA.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => fmt(v)} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function Evolucion({ datos, x }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={datos} margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={x} />
        <YAxis yAxisId="n" tickFormatter={(v) => fmt(v)} />
        <YAxis yAxisId="p" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <Tooltip formatter={(v, n) => (n.startsWith('%') ? `${fmt(v, 2)}%` : fmt(v))} />
        <Legend />
        <Bar isAnimationActive={false} yAxisId="n" dataKey="aprobadas" stackId="a" fill="#59a14f" name="Aprobadas" />
        <Bar isAnimationActive={false} yAxisId="n" dataKey="no_aprobadas" stackId="a" fill="#e15759" name="No aprobadas" />
        <Line isAnimationActive={false} yAxisId="p" dataKey="porcentaje_aprobadas" stroke="#2a6fdb" strokeWidth={2} name="% aprobadas" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default function Grafica({ viz, datos }) {
  if (!datos?.length) return <p className="vacio">La consulta no devolvió resultados.</p>;
  const { tipo, x, y, serie, sufijo } = viz || {};

  switch (tipo) {
    case 'pie':
      return <Pastel datos={datos} x={x} y={y[0]} />;
    case 'bar':
      return <Barras datos={datos} x={x} series={y} sufijo={sufijo} />;
    case 'line':
      return <Lineas datos={datos} x={x} series={y} sufijo={sufijo} />;
    case 'pivot': {
      const { filas, series } = pivotear(datos, x, serie, y);
      return <Barras datos={filas} x={x} series={series} />;
    }
    case 'pivot-line': {
      const { filas, series } = pivotear(datos, x, serie, y);
      return <Lineas datos={filas} x={x} series={series} />;
    }
    case 'evolucion':
      return <Evolucion datos={datos} x={x} />;
    default:
      return <Tabla filas={datos} />;
  }
}
