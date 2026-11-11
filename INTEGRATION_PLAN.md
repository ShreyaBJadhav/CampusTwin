# Campus Twin Integration Plan — Step 1

This is the inspection and planning step only. No application, test, fixture,
or frontend code has been changed. Implementation will wait for approval.

## Validation note from inspection

Plain workspace-wide `python -m pytest -q` currently fails during collection:
the root and Role-B test trees both contain `test_api.py`, and pytest imports
the same module name from both locations. Running only the current Role C
suite with `python -m pytest -q tests --import-mode=importlib` succeeds
(50 passed). Step 2 must preserve unambiguous collection for both suites;
this is a test-discovery issue, not a failing assertion.

## A. Role-B backend and database

- Role B uses **FastAPI**, **SQLAlchemy 2**, and **SQLite** by default. Its
  `DATABASE_URL` default is `sqlite:///./campus_twin.db`; the database layer
  enables SQLite foreign-key enforcement. The URL can be changed through the
  environment.
- `Room` fields are `id: str` (primary key), `building_id: str`, `type: str`,
  `capacity: int`, `occupancy: int`, and `last_updated: datetime`.
- `ClassSchedule` fields are `class_id: str` (primary key), `room_id: str`,
  `student_count: int`, and `type: str`.
- IDs are **strings**, not integers. This agrees with Role C's ID contract.
- `RoomOut` exposes `last_updated`; `ScheduleOut` exposes the four schedule
  fields listed above. Role C's room contract does not include
  `last_updated`, so Role C adapters should return only contract fields.
- Role B's existing API is in `Role-B/app/main.py` and its `routers/`
  package. It includes rooms, buildings, schedule, and health endpoints.

## B. Frontend API URLs and expected shapes

The API client is `campus twin/src/api/campusApi.ts`. Its current
`USE_MOCK` value is hardcoded `true`; these network endpoints describe the
non-mock path. `API_BASE_URL` defaults to `http://localhost:8000` and can be
overridden by `VITE_API_BASE_URL`.

| Method and URL | Client operation | Expected response/request |
|---|---|---|
| `GET /rooms` | `getRooms()` | `Room[]`: `{id, building_id, type, capacity, occupancy}` |
| `GET /rooms?building_id=<id>` | `getRoomsForBuilding()` | Same `Room[]` |
| `GET /schedule` | `getSchedule()` | `ScheduleEntry[]`: `{class_id, room_id, student_count, type}` |
| `GET /buildings` | `getBuildings()` | `CampusBuilding[]`: `{id, name, source_building_ids, position, size, tone, floors}` |
| `GET /rooms/{id}` | `getRoom()` | One `Room` |
| `PATCH /rooms/{id}` by default | `updateRoomOccupancy()` | Sends `{"occupancy": number}` and expects one `Room` |
| `POST /what-if` by default | `runWhatIf()` | Sends optional camelCase `unavailableRoomId` or `unavailableBuildingId`; expects `{affected_count, unavailable_room_ids, reallocated, failed}` |

`getFloorLayouts()` also fetches the static asset
`GET /data/mock_floor_layouts.json`; it is not an API endpoint. Room
utilization and dashboard summaries are currently calculated in the frontend,
not fetched from backend endpoints.

## C. Differences from `CONTRACT.md`

- **Identifiers and room category:** Role C specifies string IDs and the
  `type` field. Role B also uses string IDs and `type`; these match.
- **Room fields:** Role C room records contain `id`, `building_id`, `type`,
  `capacity`, and `occupancy`. Role B additionally stores `last_updated`.
  The proposed data-source adapter will omit that extra field from Role C
  logic records.
- **Room categories/buildings:** Role C's data uses source building IDs such
  as `academic-east`; the frontend has a separate `CampusBuilding` display
  model with geometry and source-building mappings. Role B's `GET /buildings`
  returns only `{id, name}`, not that frontend display shape.
- **Role C endpoints:** the contract defines
  `GET /rooms/{room_id}/utilization`, `GET /dashboard/summary`,
  `POST /simulate/what-if`, and `POST /allocation/alternative`. The frontend
  currently does not call utilization or dashboard endpoints. Its simulation
  path is `/what-if`, not `/simulate/what-if`.
- **Simulation names and response:** Role C uses snake_case request IDs and
  returns `impact` plus optional failure `detail`; the frontend currently
  sends camelCase IDs and its `WhatIfResult` type omits `impact` and `detail`.
- **Occupancy update:** Role B exposes
  `PATCH /rooms/{room_id}/occupancy` with
  `{"current_occupancy": int}`. The frontend defaults to
  `PATCH /rooms/{id}` with `{"occupancy": number}`. Both the path and body
  need alignment.
- **Alternative allocation:** this endpoint is in Role C's contract but is
  not currently called by `campusApi.ts`.
- **Status codes and errors:** Role C documents `404` for unknown IDs and
  `400` for other invalid input, with `{"detail": "..."}`. Role B currently
  emits `422` for request validation and responds to 404 with both `error`
  and `detail` fields. These handlers need to be reconciled while retaining
  Role B's routes.
- **CORS:** Role B already defaults its CORS origin to
  `http://localhost:5173`, configurable with `CORS_ORIGINS`.

## D. `app` package-name clash and proposed resolution

Both projects have a top-level Python package named `app`. Running from the
workspace root or importing both packages by the same name would make module
resolution ambiguous.

**Smallest proposed fix, keeping Role B as the base app:** keep
`Role-B/app/` as the sole application package; move Role C's five logic
modules (`utilization.py`, `allocation.py`, `simulate.py`, `dashboard.py`,
and `errors.py`) under `Role-B/app/logic/`, changing only their internal
import paths. Add the Role C API router alongside Role B's existing routers
and include it from Role B's `main.py`. Move Role C tests into the Role-B
test tree with import-path changes only. Use mock-data mode or test
dependency overrides so tests do not require a live database service.

## E. Mock data differences

Comparison was made by room/class IDs. Role B's `data/mock_rooms.json` has
11 records; Role C's `data/mock_rooms.json` has 15:

- Role C only: `classroom-104`, `classroom-105`, `lab-203`, and `lab-204`.
- Shared record difference: Role B has `admin-meeting.occupancy = 17`,
  while Role C has `occupancy = 15` (both have capacity 16).
- **Fixture issue:** Role B's room JSON currently has a leading line of
  repeated `1` characters before the JSON array, so it is not valid JSON as
  checked in. Its seeder reads this file directly; the fixture will need
  correction before Role B seeding or mock fallback can use it.

Role B's `data/mock_schedule.json` has 11 records; Role C's has 13. The two
Role C-only entries are `lab-003` (room `lab-203`) and `lab-004`
(room `lab-204`). Other schedule records match.

**Proposed fixture direction:** use Role C's valid fixtures as the canonical
input for Role C logic and its `USE_MOCK_DATA=true` fallback, while deciding
with the team whether to retain Role B's `admin-meeting` over-capacity sample
or use Role C's occupancy value. Role B's seed currently reads its own
`Role-B/data` fixtures, so this decision also determines whether those files
are synchronized.

## Decisions to confirm before implementation

1. Keep IDs as strings (this matches both existing schemas and the contract).
2. Resolve `admin-meeting` occupancy (17 in Role B versus 15 in Role C).
3. Confirm whether Role C's fixtures should replace/synchronize Role B's
   room and schedule fixtures; Role B's room fixture must be made valid JSON
   regardless before its current seeder can load it.
4. Confirm the frontend's `CampusBuilding` display fields remain frontend
   metadata rather than being added to the backend `Building` schema.
