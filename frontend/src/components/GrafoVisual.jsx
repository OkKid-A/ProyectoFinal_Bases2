import { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

export const COLORES_NODO = {
  Aspirante: '#2a6fdb',
  Carrera: '#f28e2b',
  Materia: '#b07aa1',
  Institucion: '#76b7b2',
  TipoInstitucion: '#9c755f',
  Municipio: '#59a14f',
  Departamento: '#edc948',
};

const TAMANO_NODO = { Aspirante: 1, Materia: 7, Carrera: 7, Departamento: 8, Municipio: 6, Institucion: 5, TipoInstitucion: 6 };

export default function GrafoVisual({ grafo, alto = 560 }) {
  const contenedor = useRef(null);
  const fg = useRef(null);
  const [ancho, setAncho] = useState(800);
  const [seleccion, setSeleccion] = useState(null);

  useEffect(() => {
    const obs = new ResizeObserver(([e]) => setAncho(e.contentRect.width));
    if (contenedor.current) obs.observe(contenedor.current);
    return () => obs.disconnect();
  }, []);

  // Copia: la librería modifica los objetos
  const datos = useMemo(
    () => ({
      nodes: (grafo?.nodos || []).map((n) => ({ ...n })),
      links: (grafo?.enlaces || []).map((l) => ({ ...l })),
    }),
    [grafo]
  );

  useEffect(() => {
    setSeleccion(null);
    fg.current?.d3Force('charge')?.strength(-45);
    fg.current?.d3Force('link')?.distance(35);
    fg.current?.d3ReheatSimulation();
    const t = setTimeout(() => fg.current?.zoomToFit(400, 40), 1200);
    return () => clearTimeout(t);
  }, [datos]);

  const tiposPresentes = [...new Set(datos.nodes.map((n) => n.tipo))];

  if (!datos.nodes.length) return <p className="vacio">No hay nodos para mostrar con los filtros seleccionados.</p>;

  return (
    <div className="grafo-contenedor" ref={contenedor}>
      <div className="grafo-leyenda">
        {tiposPresentes.map((t) => (
          <span key={t}>
            <i style={{ background: COLORES_NODO[t] || '#999' }} /> {t}
          </span>
        ))}
        <span>
          <i className="linea" style={{ background: '#2e9d4f' }} /> Aprobó
        </span>
        <span>
          <i className="linea" style={{ background: '#d9534f' }} /> No aprobó
        </span>
        <span className="muted">
          {datos.nodes.length} nodos · {datos.links.length} relaciones
        </span>
      </div>
      <ForceGraph2D
        ref={fg}
        graphData={datos}
        width={ancho}
        height={alto}
        backgroundColor="#fbfcfe"
        nodeId="id"
        nodeRelSize={3}
        nodeVal={(n) => TAMANO_NODO[n.tipo] || 4}
        nodeColor={(n) => COLORES_NODO[n.tipo] || '#999'}
        nodeLabel={(n) => `${n.tipo}: ${n.etiqueta}`}
        linkColor={(l) => (l.tipo === 'EVALUADO_EN' ? (l.aprobado ? '#2e9d4f' : '#d9534f') : '#b8c2d0')}
        linkWidth={(l) => (l.tipo === 'EVALUADO_EN' ? Math.min(1 + l.cantidad * 0.6, 4) : 1)}
        linkLabel={(l) => (l.tipo === 'EVALUADO_EN' ? `${l.tipo} (${l.cantidad} intento/s)` : l.tipo)}
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={1}
        cooldownTicks={120}
        onNodeClick={(n) => setSeleccion({ clase: 'nodo', dato: n })}
        onLinkClick={(l) => setSeleccion({ clase: 'enlace', dato: l })}
        nodeCanvasObjectMode={() => 'after'}
        nodeCanvasObject={(n, ctx, escala) => {
          if (n.tipo === 'Aspirante' && escala < 2.5) return;
          const tam = 10 / escala;
          ctx.font = `${tam}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = '#334';
          ctx.fillText(n.etiqueta, n.x, n.y + Math.sqrt(TAMANO_NODO[n.tipo] || 4) * 3 + 1);
        }}
      />
      {seleccion && (
        <div className="grafo-detalle">
          <button className="cerrar" onClick={() => setSeleccion(null)} aria-label="Cerrar">
            ×
          </button>
          {seleccion.clase === 'nodo' ? (
            <>
              <h4>
                <i style={{ background: COLORES_NODO[seleccion.dato.tipo] }} /> {seleccion.dato.etiqueta}
              </h4>
              <p className="muted">:{seleccion.dato.tipo}</p>
              <dl>
                {Object.entries(seleccion.dato.propiedades || {}).map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{Array.isArray(v) ? v.join(', ') : String(v)}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <>
              <h4>:{seleccion.dato.tipo}</h4>
              <p className="muted">
                {seleccion.dato.source?.etiqueta} → {seleccion.dato.target?.etiqueta}
              </p>
              <pre>{JSON.stringify(seleccion.dato.detalle, null, 2)}</pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
