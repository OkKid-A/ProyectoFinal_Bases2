import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';

const CatalogosContext = createContext(null);

const VACIO = { anios: [], materias: [], carreras: [], departamentos: [], tipos: [], sexos: [], municipios: [] };

export function CatalogosProvider({ children }) {
  const [catalogos, setCatalogos] = useState(VACIO);
  const [error, setError] = useState(null);
  const [anio, setAnio] = useState('');

  const recargar = useCallback(async () => {
    try {
      setCatalogos(await api.catalogos());
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return <CatalogosContext.Provider value={{ ...catalogos, error, recargar, anio, setAnio }}>{children}</CatalogosContext.Provider>;
}

export const useCatalogos = () => useContext(CatalogosContext);

export function SelectCatalogo({ valores, value, onChange, todos = 'Todos', ...props }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...props}>
      <option value="">{todos}</option>
      {valores.map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </select>
  );
}
