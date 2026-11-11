# Campus Twin — Role B Backend (Steps 1–2)

Python, FastAPI, SQLAlchemy, SQLite. The original Node.js project is not changed.

## Setup (Windows PowerShell)
```powershell
cd CAMPUS-TWIN-ROLE-B
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
py -m app.seed
uvicorn app.main:app --reload
```

Open API documentation at http://127.0.0.1:8000/docs and health at http://127.0.0.1:8000/health.

## Endpoints included (Steps 1–2)
- `GET /rooms` (optional `building_id` and `type`)
- `GET /buildings`
- `GET /buildings/{building_id}/rooms`
- `GET /rooms/{room_id}` (includes schedule entries)
- `PATCH /rooms/{room_id}/occupancy` with `{"current_occupancy": 18}`
- `GET /schedule` (optional `room_id`)
- `GET /health`

Role C wrapper endpoints / simulation are intentionally not implemented yet.

## Tests
```powershell
pytest -q
```

## Data decisions and mismatches
- Original data had 6 buildings. `science-west` and its only room `lab-203` were removed to comply with the new 2–5 building instruction; schedule entry `lab-003` was removed because its room is not included. Remaining data has 5 buildings, 11 rooms and 11 schedule entries.
- Original data had no room with occupancy above capacity. To test the explicit requirement that over-capacity occupancy is stored, `admin-meeting` occupancy was changed from 15 to 17 while capacity remains 16. This is visible in `data/mock_rooms.json`.
- Contract uses stored field `occupancy`; PATCH input uses `current_occupancy` as requested.
- The Python `app/` Role C files named in the supplied prompt were not present in the original project at inspection time. No Role C logic was invented or modified.
- This seed is idempotent (uses merge/upsert by ID) and preserves occupancy above capacity.
