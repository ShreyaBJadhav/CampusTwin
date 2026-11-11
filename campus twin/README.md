# Digital Twin Campus Resource Management

Browser-based digital twin for campus room utilization and outage planning. Built with React, Vite, TypeScript, Tailwind CSS, Three.js, React Three Fiber, and Drei.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Use `npm run build` for a production build and `npm run lint` for Oxlint.

## Mock data and API

All campus data access and client-side contract logic live in `src/api/campusApi.ts`. The current demo reads `public/data/mock_rooms.json` and `public/data/mock_schedule.json`.

The Academic Block floor assignments are frontend-only demo metadata in `public/data/mock_floor_layouts.json`; they do not add fields to the backend `Room` contract. Room utilization, status, and available seats are calculated from the mock/API room values.

To connect FastAPI, set `USE_MOCK` to `false` in `src/api/campusApi.ts` and set `VITE_API_BASE_URL` (see `.env.example`). Building, room, schedule, simulation, and occupancy paths/method are configurable with the `VITE_API_*` variables. The occupancy update currently assumes a JSON body `{ "occupancy": number }` and a response containing the updated room. Confirm these response/body assumptions with the backend team before enabling real API mode. Mock mode rejects writes rather than pretending they were saved.

For the current demonstration, the buildings endpoint is expected to return the frontend's `CampusBuilding` shape. The building display configs and floor assignments remain local presentation metadata; adapt the mapping in `campusApi.ts` when the backend's actual building response is agreed.

The `classroom-101` and `academic-east` scenarios are deterministic examples; all other mock outage scenarios use the generic same-type, smallest-sufficient-capacity allocation rule. Alternative rooms are not reused during one simulation run.

## Project structure

```text
public/
  data/
    mock_floor_layouts.json
    mock_rooms.json
    mock_schedule.json
src/
  api/
    campusApi.ts
  components/
    Building.tsx
    BuildingInfoPanel.tsx
    BuildingListPanel.tsx
    CampusNavigation.tsx
    CampusScene.tsx
    DashboardPanel.tsx
    FloorNavigationPanel.tsx
    FloorRoomPlan3D.tsx
    FloorStack3D.tsx
    ResultsView.tsx
    RoomDetail.tsx
    RoomMarker.tsx
    RoomObject3D.tsx
    StatusBadge.tsx
    WhatIfPanel.tsx
  constants/
    campus.ts
    status.ts
  types/
    campus.ts
  App.css
  App.tsx
  index.css
  main.tsx
```
