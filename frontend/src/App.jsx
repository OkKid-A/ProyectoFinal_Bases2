import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { api } from './api';
import { CatalogosProvider, SelectCatalogo, useCatalogos } from './catalogos';
import ErrorBoundary from './components/ErrorBoundary';
import Icono from './components/Iconos';
import Carga from './pages/Carga';
import Dashboard from './pages/Dashboard';
import Grafos from './pages/Grafos';
import Busqueda from './pages/Busqueda';
import Aspirante from './pages/Aspirante';
import Consola from './pages/Consola';

const MENU = [
  { ruta: '/dashboard', texto: 'Dashboard', icono: 'dashboard' },
  { ruta: '/grafos', texto: 'Explorador de grafos', icono: 'grafo' },
  { ruta: '/busqueda', texto: 'Buscador', icono: 'buscar' },
  { ruta: '/aspirante', texto: 'Aspirante', icono: 'persona' },
  { ruta: '/carga', texto: 'Carga de archivos', icono: 'subir' },
  { ruta: '/consola', texto: 'Consola de consultas', icono: 'codigo' },
];

function EstadoConexion() {
  const [estado, setEstado] = useState(null);
  useEffect(() => {
    const revisar = async () => {
      const r = await api.salud();
      setEstado(r instanceof Error ? { api: { ok: false, error: r.message }, mongo: {}, neo4j: {} } : r);
    };
    revisar();
    const t = setInterval(revisar, 15000);
    return () => clearInterval(t);
  }, []);
  if (!estado) return null;
  const punto = (nombre, s) => (
    <span className="estado" title={s?.error || 'Conectado'}>
      <i className={s?.ok ? 'ok' : 'mal'} /> {nombre}
    </span>
  );
  return (
    <div className="estados">
      <Icono nombre="base" tamano={18} />
      {punto('API', estado.api)}
      {punto('MongoDB', estado.mongo)}
      {punto('Neo4j', estado.neo4j)}
    </div>
  );
}

function BarraSuperior({ onMenu }) {
  const { pathname } = useLocation();
  const { anios, anio, setAnio } = useCatalogos();
  const actual = MENU.find((m) => pathname.startsWith(m.ruta));
  const titulo = actual?.texto || 'Página no encontrada';

  return (
    <header className="barra-superior">
      <div className="barra-titulo">
        <div className="migas">
          <Link to="/dashboard" aria-label="Inicio">
            <Icono nombre="inicio" tamano={15} />
          </Link>
          <span>/</span>
          <span>{titulo}</span>
        </div>
        <strong>{titulo}</strong>
      </div>
      <button className="boton-menu" onClick={onMenu} aria-label="Mostrar u ocultar menú">
        <Icono nombre="menu" tamano={22} />
      </button>
      <div className="barra-centro">
        {pathname.startsWith('/dashboard') && (
          <SelectCatalogo
            valores={anios.map(String)}
            value={anio}
            onChange={setAnio}
            todos="Todos los años de ingreso"
            aria-label="Año de ingreso"
          />
        )}
      </div>
      <EstadoConexion />
    </header>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const [colapsado, setColapsado] = useState(false);

  return (
    <CatalogosProvider>
      <div className={`layout ${colapsado ? 'colapsado' : ''}`}>
        <aside className="sidebar">
          <Link to="/dashboard" className="marca">
            <span className="marca-texto">
              <strong>PRUEBAS USAC</strong>
              <small>Facultad de Ingeniería</small>
            </span>
          </Link>
          <nav>
            {MENU.map((m) => (
              <NavLink key={m.ruta} to={m.ruta} title={m.texto}>
                <span className="icono-caja">
                  <Icono nombre={m.icono} tamano={18} />
                </span>
                <span className="nav-texto">{m.texto}</span>
              </NavLink>
            ))}
          </nav>
        </aside>
        <div className="principal">
          <BarraSuperior onMenu={() => setColapsado((c) => !c)} />
          <main className="contenido">
            <ErrorBoundary key={pathname}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/grafos" element={<Grafos />} />
                <Route path="/busqueda" element={<Busqueda />} />
                <Route path="/aspirante/:id?" element={<Aspirante />} />
                <Route path="/carga" element={<Carga />} />
                <Route path="/consola" element={<Consola />} />
                <Route path="*" element={<p>Página no encontrada.</p>} />
              </Routes>
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </CatalogosProvider>
  );
}
