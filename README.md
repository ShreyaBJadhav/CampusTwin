# Campus Twin

Campus Twin integrates the Role A React/Vite campus UI, the Role B
FastAPI/SQLAlchemy/SQLite backend, and the Role C utilization, allocation,
dashboard, and outage-simulation logic.

## Run the full app (Windows PowerShell)

Prerequisites: Python 3.10+ and Node.js/npm.

### 1. Set up and start the backend

In the first PowerShell terminal, from the repository root:

```powershell
Set-Location .\Role-B
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m app.seed
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend API runs at `http://127.0.0.1:8000`; its interactive docs are at
`http://127.0.0.1:8000/docs`.

### 2. Configure and start the frontend

In a second PowerShell terminal, from the repository root:

```powershell
Set-Location ".\campus twin"
npm install
Copy-Item .env.example .env
```

Ensure `.env` contains:

```dotenv
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Then start Vite:

```powershell
npm run dev
```

Open `http://localhost:5173`. Do not commit `.env` or the SQLite database.

## Tests and demo

Run the backend tests:

```powershell
Set-Location .\Role-B
.\.venv\Scripts\Activate.ps1
python -m pytest -q
```

Run the four Role C outage scenarios:

```powershell
Set-Location .\Role-B
.\.venv\Scripts\Activate.ps1
python run_demo.py
```

## Project layout

- `Role-B/app/` — FastAPI application, SQLAlchemy models, and Role C logic
  under `Role-B/app/logic/`.
- `Role-B/data/` — canonical room and schedule fixtures used by the seeder.
- `Role-B/tests/` — backend and Role C tests.
- `campus twin/` — React/Vite frontend.
- `docs/CONTRACT.md` — Python logic and HTTP API contract, with examples
  captured from the running API.

`Role-B/requirements.txt` is the canonical Python dependency list, including
`pytest` and `httpx`.
