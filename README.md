# Role C: room utilization and scheduling

This project provides room-utilization calculations, alternative-room
allocation, outage simulations, and a dashboard summary, with a FastAPI layer
that exposes the functionality to the frontend. The current data source reads
the JSON fixtures in `data/`; it can be replaced independently of the API
routes.

## Setup on Windows

From the project root in PowerShell, create and activate a virtual environment
and install dependencies:

```powershell
py -3.14 -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

## Run tests

```powershell
python -m pytest -q
```

## Run the demo

```powershell
python run_demo.py
```

## Start the HTTP API

```powershell
python -m uvicorn app.api:app --reload
```

The API base URL is `http://localhost:8000`. Interactive API documentation is
available at `http://localhost:8000/docs`.

## Role C module map

- `app/utilization.py` — calculates room utilization percentage and status.
- `app/allocation.py` — finds an alternative room with sufficient capacity.
- `app/simulate.py` — simulates a room or building outage and class
  reallocations.
- `app/dashboard.py` — summarizes room counts and utilization statuses.
- `app/api.py` — exposes the logic through HTTP endpoints.
- `app/data_source.py` — loads room and schedule data for the API; replace
  these functions to connect a database.