# Pruebas Específicas USAC — MongoDB + Neo4j

Aplicación para cargar, procesar, analizar y visualizar los resultados de las **pruebas específicas** de aspirantes
a la Facultad de Ingeniería de la USAC, usando **MongoDB** (base documental) y **Neo4j** (base de grafos).

Proyecto final — Sistemas de Bases de Datos 2.

## Componentes

| Componente | Tecnología | Carpeta |
|---|---|---|
| Frontend | React 18 + Vite, Recharts, react-force-graph | `frontend/` |
| Backend / API | Node.js 20 + Express 5 | `backend/` |
| Base documental | MongoDB 7 | `docker-compose.yml` |
| Base de grafos | Neo4j 5.26 | `docker-compose.yml` |
| ETL | Node.js (csv-parse, streaming) | `backend/src/etl/` |
| Consultas MongoDB | Aggregation Framework | `backend/src/queries/mongoQueries.js`, `consultas/mongodb_consultas.js` |
| Consultas Cypher | Cypher | `backend/src/queries/cypherQueries.js`, `consultas/neo4j_consultas.cypher` |

## Requisitos

- Docker y Docker Compose
- Node.js 20.19 o superior

## Ejecución rápida

Todo el sistema (MongoDB, Neo4j, backend y frontend) se levanta con un solo comando:

```bash
docker compose up -d --build
```

Abrir <http://localhost:5174>. El backend espera a que MongoDB y Neo4j estén listos (healthchecks) y el frontend
se sirve con nginx, que reenvía `/api` al backend. Para cargar CSV desde la terminal dentro del contenedor (la carpeta
`data/` se monta en `/data`):

```bash
docker compose exec backend npm run cargar -- /data/archivo1.csv
```

### Desarrollo local (sin contenedores para backend y frontend)

1. Levantar solo MongoDB y Neo4j:

```bash
docker compose up -d mongo neo4j
```

2. Backend (puerto 3001):

```bash
cd backend && cp .env.example .env && npm install && npm run dev
```

3. Frontend (puerto 5174):

```bash
cd frontend && npm install && npm run dev
```

4. Abrir <http://localhost:5174>, ir a **Carga de archivos** y subir los CSV del dataset.

Neo4j Browser queda disponible en <http://localhost:7474> (usuario `neo4j`, contraseña `password123`).

## Datos

El dataset oficial es **Pruebas específicas** del portal de Datos Abiertos de la Facultad de Ingeniería:
<https://datosabiertos.ingenieria.usac.edu.gt/en/dataset/pruebas-especificas>.

Los archivos de 2015 a 2024 están en `data/`. Se cargan desde la interfaz o desde la terminal:

```bash
cd backend && npm run cargar -- ../data/archivo1.csv ../data/archivo2.csv
```

`data/ejemplo/` contiene archivos **sintéticos** (no reales) con la misma estructura y con errores intencionales
para probar el ETL. Se generan con `node data/ejemplo/generar_ejemplo.js`.

## Documentación

La documentación del proyecto está en la carpeta `docs/`.
