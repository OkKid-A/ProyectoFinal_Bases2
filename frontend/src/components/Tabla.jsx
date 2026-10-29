import { useMemo, useState } from 'react';
import { fmt } from '../api';

// Columnas sin separador de miles
const SIN_SEPARADOR = /anio|^edad|intento|linea|^mes/;

const mostrar = (v, col = '') => {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'number') return SIN_SEPARADOR.test(col) ? String(v) : fmt(v, 2);
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
  if (Array.isArray(v)) {
    if (v.every((x) => typeof x !== 'object')) return v.join(', ');
    return v.map((x) => Object.values(x).join(': ')).join(' · ');
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

export default function Tabla({ filas, columnas, porPagina = 15, render = {} }) {
  const cols = useMemo(
    () => columnas || [...new Set((filas || []).flatMap((f) => Object.keys(f)))],
    [filas, columnas]
  );
  const [orden, setOrden] = useState(null);
  const [pagina, setPagina] = useState(1);

  const ordenadas = useMemo(() => {
    if (!orden) return filas || [];
    const { col, asc } = orden;
    return [...(filas || [])].sort((a, b) => {
      const x = a[col];
      const y = b[col];
      if (x === y) return 0;
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      return (x > y ? 1 : -1) * (asc ? 1 : -1);
    });
  }, [filas, orden]);

  if (!filas?.length) return <p className="vacio">Sin resultados.</p>;

  const totalPaginas = Math.ceil(ordenadas.length / porPagina);
  const visibles = ordenadas.slice((pagina - 1) * porPagina, pagina * porPagina);

  return (
    <div>
      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              {cols.map((c) => (
                <th
                  key={c}
                  onClick={() => setOrden((o) => ({ col: c, asc: o?.col === c ? !o.asc : true }))}
                  title="Ordenar"
                >
                  {c.replace(/_/g, ' ')}
                  {orden?.col === c ? (orden.asc ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((f, i) => (
              <tr key={i}>
                {cols.map((c) => (
                  <td key={c}>{render[c] ? render[c](f[c], f) : mostrar(f[c], c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPaginas > 1 && (
        <div className="paginacion">
          <button className="btn btn-sec" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>
            ‹
          </button>
          <span>
            Página {pagina} de {totalPaginas} ({fmt(ordenadas.length)} filas)
          </span>
          <button className="btn btn-sec" disabled={pagina === totalPaginas} onClick={() => setPagina(pagina + 1)}>
            ›
          </button>
        </div>
      )}
    </div>
  );
}
