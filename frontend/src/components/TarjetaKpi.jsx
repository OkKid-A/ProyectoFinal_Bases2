import { Link } from 'react-router-dom';

export default function TarjetaKpi({ valor, titulo, subtitulo, a, ayuda, tono, compacta }) {
  const clases = `kpi ${compacta ? 'compacta' : ''} ${a ? 'clic' : ''}`;
  const contenido = (
    <>
      <strong className={`kpi-valor ${tono || ''}`}>{valor}</strong>
      <span className="kpi-titulo">{titulo}</span>
      {subtitulo && <span className="kpi-sub">{subtitulo}</span>}
    </>
  );
  return a ? (
    <Link to={a} className={clases} data-tooltip={ayuda}>
      {contenido}
    </Link>
  ) : (
    <div className={clases}>{contenido}</div>
  );
}
