# Integration summary

Evidence: checked-in source and `INTEGRATION_PLAN.md`; “before” refers to the
separate Role A/B/C surfaces inspected before integration. The tracked
comparison is `234cbe1` → `2ab5cd2` (HEAD); existing working-tree edits are
excluded.

| Area | Before integration | After integration |
|---|---|---|
| Backend | Role B’s FastAPI/SQLAlchemy/SQLite app and Role C logic/API were separate; both used `app`. | `Role-B/app` serves both: Role C logic is in `app/logic` and its router is included. |
| Data source | Role B/C fixtures differed (11 vs. 15 rooms; 11 vs. 13 schedules); Role B JSON was invalid and `admin-meeting` occupancy differed (17 vs. 15). | SQLite is the default; `USE_MOCK_DATA` selects valid canonical fixtures (15 rooms, 13 schedules, occupancy 15). |
| Frontend | Role A’s React/Vite app defaulted to mock data and calculated utilization/dashboard locally; write/simulation calls did not match the backend. | `VITE_USE_MOCK=false` selects live room, schedule, utilization, dashboard, occupancy and simulation APIs; campus geometry remains client metadata. |
| Endpoints | Role A used `PATCH /rooms/{id}` and `POST /what-if`; Role C routes were unwired. | Eleven routes are served (list below); occupancy and simulation calls now match. Alternative allocation has no frontend call. |
| Contract | Standalone contract and Role A/B request/response shapes disagreed. | `docs/CONTRACT.md` is canonical; adapters map backend records to logic/frontend shapes. |
| Tests | The plan records 50 Role C tests passing with `--import-mode=importlib`; workspace collection collided on duplicate `test_api.py` names. | 86 declared functions: 45 under `Role-B/tests`, 41 under root `tests` (parameterization adds cases). Not run here: `pytest` and FastAPI are missing. |
| Error handling | Role C specified 400/404 `{"detail": ...}`; Role B used 422 validation and 404 `error` + `detail`. | Role C routes translate to 400/404 `detail`; Role B handlers remain unchanged, so formats are route-specific. |

## Changed files by role

Stats use `git diff --stat 234cbe1..HEAD`, filtered by role. Role A: **43
files, 5,144 insertions** — under `campus twin/`: root `.env.example`,
`.gitignore`, `.oxlintrc.json`, `README.md`, `index.html`, `package.json`,
`package-lock.json`, `tsconfig.app.json`, `tsconfig.json`, `tsconfig.node.json`,
`vite.config.ts`; `public/{favicon.svg,icons.svg}`,
`public/data/{mock_floor_layouts.json,mock_rooms.json,mock_schedule.json}`;
`src/App.{css,tsx}`, `src/index.css`, `src/main.tsx`,
`src/api/campusApi.ts`, `src/types/campus.ts`, `src/constants/{campus,status}.ts`,
`src/assets/{hero.png,react.svg,vite.svg}`, and
`src/components/{AppErrorBoundary,Building,BuildingInfoPanel,BuildingListPanel,CampusNavigation,CampusScene,DashboardPanel,FloorNavigationPanel,FloorRoomPlan3D,FloorStack3D,ResultsView,RoomDetail,RoomMarker,RoomObject3D,StatusBadge,WhatIfPanel}.tsx`.

Role B backend: **14 non-empty files, 353 insertions** — `Role-B/.env.example`,
`.gitignore`, `app/{database,main,models,schemas,seed}.py`,
`app/routers/{buildings,rooms,schedule}.py`, `data/{mock_rooms,mock_schedule}.json`,
`requirements.txt`, and `tests/test_api.py` (plus empty package `__init__.py`
files).

Role C integration: **18 files, 1,485 insertions** — `Role-B/app/logic/`
(`__init__.py`, `allocation.py`, `dashboard.py`, `errors.py`, `simulate.py`,
`utilization.py`), `app/routers/role_c.py`, `run_demo.py`, and
`tests/role_c/` (`__init__.py`, `conftest.py`, and the eight
`test_role_c_*.py` modules). Shared adapter: `Role-B/app/data_source.py`
(56 lines). Canonical fixture files are listed under Role B above because
they also seed its database.

**History caveat:** `234cbe1` contains the standalone Role C `app/` and
`tests/`, but not the Role A or Role B trees. The available checkpoint
`c12646b` has no common ancestor with HEAD, so it cannot establish a
pre-integration Role A/B file diff. The stats above are the reproducible
comparison against `234cbe1`, not evidence of who originally authored those
trees.

## Mismatches and resolution

- **Package and record shapes:** Role C moved under `Role-B/app/logic`, avoiding
  runtime package ambiguity. IDs/types already matched; the adapter/frontend
  strip Role B’s extra `last_updated`. The client joins Role B’s `{id, name}`
  buildings with local geometry metadata.
- **Paths and payloads:** The client now sends occupancy to
  `/rooms/{room_id}/occupancy` as `current_occupancy`; it calls the Role C
  utilization/dashboard/simulation paths and converts UI camelCase input to
  snake_case. Simulation types include `impact` and failure `detail`.
- **Fixtures:** Canonical Role-B fixtures resolve the invalid JSON, count and
  `admin-meeting` differences. Role A’s separate mock rooms remain divergent:
  26 rows (including duplicate `lab-301`) versus 15, with different values.
- **Still divergent:** Role C returns 400/404 `detail`, while Role B routes keep
  422/404 handlers. Allocation is API-only, not called by the UI. Default
  CORS origin matches Vite’s `http://localhost:5173`.

## Current routes

`GET /health`; `GET /buildings`; `GET /buildings/{building_id}/rooms`;
`GET /rooms` (optional `building_id`, `type`); `GET /rooms/{room_id}`;
`PATCH /rooms/{room_id}/occupancy`; `GET /schedule` (optional `room_id`);
`GET /rooms/{room_id}/utilization`; `GET /dashboard/summary`;
`POST /simulate/what-if`; `POST /allocation/alternative`.

## Known limitations

- No live sensor feed; live reads use seeded SQLite. Frontend mock rooms and
  campus geometry remain client-owned.
- Legacy root `app/` and `tests/` coexist with `Role-B/`, including duplicate
  `test_api.py` names. The 86 count is declarations, not a passing run.
