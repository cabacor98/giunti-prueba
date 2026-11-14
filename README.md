# Giunti Psychometrics — Questionnaire Parser

Aplicación web que permite subir un cuestionario en PDF, Word (.docx) o Excel (.xlsx) y
devuelve automáticamente los ítems y sus alternativas de respuesta en un JSON estandarizado,
detectando el tipo de ítem (escala Likert, selección múltiple, verdadero/falso, desarrollo,
emparejamiento) y el idioma del documento (italiano, español, inglés, entre otros).

## URLs de producción

- Frontend: https://giunti-frontend.onrender.com
- Backend (FastAPI): https://giunti-backend.onrender.com
- Health check: https://giunti-backend.onrender.com/health

## Stack

- **Backend:** Python 3.12 + FastAPI + Uvicorn, Pydantic v2, pdfplumber, python-docx, openpyxl, langdetect.
- **LLM / extracción:** Google Gemini (`gemini-3.5-flash`) vía API gratuita de Google AI Studio.
- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS.
- **Deploy:** Render (backend + frontend), Docker para el backend.

## Estructura del repositorio

```
giu/
├── backend/          # FastAPI
│   ├── app/          # código de la aplicación
│   ├── tests/        # Pytest
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/         # Next.js
├── examples/         # archivos de prueba + JSON resultante
├── render.yaml       # blueprint de Render
└── README.md
```

## Requisitos previos

- Python 3.12+
- Node.js 20+
- (Opcional) Docker

## Instalación y ejecución local

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate   |   Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edita .env y coloca tu GEMINI_API_KEY
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Endpoints:

- `GET /health`
- `POST /api/parse` (multipart, campo `file`)

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# edita .env.local -> NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Abre http://localhost:3000.

## Variables de entorno

### Backend (`backend/.env`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `GEMINI_API_KEY` | API key de Google AI Studio | `AIza...` |
| `GEMINI_MODEL` | Modelo Gemini a usar | `gemini-3.5-flash` |
| `MAX_FILE_SIZE_MB` | Tamaño máximo de archivo | `10` |
| `ALLOWED_ORIGINS` | Orígenes CORS permitidos (separados por coma) | `http://localhost:3000,https://giunti-frontend.onrender.com` |
| `LOG_LEVEL` | Nivel de logging | `INFO` |

### Frontend (`frontend/.env.local`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL del backend | `https://giunti-backend.onrender.com` |

## Tests

```bash
cd backend
pytest -q
```

Los tests cubren la validación de archivos (extensión, tamaño, vacío) y el esquema de salida
(Pydantic), además del endpoint `/health` y `/api/parse` con el LLM mockeado.

## Ejemplos

En `/examples` encontrarás tres cuestionarios inventados (uno por formato) y su JSON resultante:

- `sample_en.pdf` → `sample_en.result.json`
- `sample_es.docx` → `sample_es.result.json`
- `sample_it.xlsx` → `sample_it.result.json`

## Despliegue

El despliegue se realizó en Render:

- Backend: servicio Docker basado en `backend/Dockerfile`, con `rootDir=backend`.
- Frontend: servicio Node con `buildCommand = npm install && npm run build` y `startCommand = npm start`, con `rootDir=frontend`.

Las API keys se configuran como variables de entorno en Render (nunca en el repositorio).

## Notas

- Solo se usan cuestionarios inventados; no se sube material de tests comerciales ni datos personales.
- El LLM se invoca con `responseMimeType: application/json` y temperatura baja para obtener
  JSON estable; la salida se valida con Pydantic antes de responder.
