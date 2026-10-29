export default function Alerta({ tipo = 'error', error, children }) {
  if (!error && !children) return null;
  return (
    <div className={`alerta alerta-${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      {error ? (
        <>
          <strong>{error.message || String(error)}</strong>
          {error.detalle && <div className="alerta-detalle">{String(error.detalle)}</div>}
        </>
      ) : (
        children
      )}
    </div>
  );
}
