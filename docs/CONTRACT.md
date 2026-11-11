# Campus Twin Contract

This document describes the Role C logic under `Role-B/app/logic/` and all
live HTTP endpoints served by `Role-B/app/main.py`. The canonical fixtures
are in `Role-B/data/`. HTTP examples below were captured from the running
Role-B API at `http://127.0.0.1:8000`; timestamps reflect that capture.

## Record schemas

### Room

Room records are dictionaries with these fields:

| Field | Type | Meaning |
|---|---|---|
| `id` | `str` | Unique room identifier. |
| `building_id` | `str` | Building identifier; used to find rooms affected by a building outage. |
| `type` | `str` | Room category such as `classroom`, `lab`, `library`, or `admin`. |
| `capacity` | `int` | Total room capacity. Must be positive for utilization calculations. |
| `occupancy` | `int` | Current occupants. Must be non-negative for utilization calculations. |

### Schedule entry

Schedule entries are dictionaries with these fields:

| Field | Type | Meaning |
|---|---|---|
| `class_id` | `str` | Unique class identifier. |
| `room_id` | `str` | ID of the room where the class is scheduled. |
| `student_count` | `int` | Number of students requiring a room. |
| `type` | `str` | Required room category; must match a room's `type`. |

All IDs are strings, with values such as `classroom-101`. The backend schema
must use string IDs or convert IDs to strings at the API boundary.

## Role C logic

### `Role-B/app/logic/utilization.py` — `calculate_utilization(room: dict) -> dict`

Calculates occupancy as a percentage of capacity and assigns a status:

- `low`: less than 40%
- `normal`: 40% through 75%
- `high`: above 75% through 90%
- `overloaded`: above 90%

If occupancy is greater than capacity, the result includes a warning.

Return shapes:

- Within capacity: `{"percentage": float, "status": str}`
- Over capacity: `{"percentage": float, "status": "overloaded", "warning": "occupancy exceeds capacity"}`

Raises `ValueError` for missing required fields, non-finite values,
non-positive capacity, or negative occupancy. Raises `TypeError` when `room`
is not a dictionary or when capacity or occupancy is not numeric, including
booleans.

Example using `classroom-101` from the canonical fixture:

```python
calculate_utilization(rooms[0])
```

```python
{"percentage": 30.0, "status": "low"}
```

Example where occupancy exceeds capacity:

```python
calculate_utilization({
    "id": "classroom-101",
    "building_id": "academic-east",
    "type": "classroom",
    "capacity": 40,
    "occupancy": 45,
})
```

```python
{
    "percentage": 112.5,
    "status": "overloaded",
    "warning": "occupancy exceeds capacity",
}
```

### `Role-B/app/logic/allocation.py` — `find_alternative_room(unavailable_room_id: str, required_capacity: int, room_type: str, rooms: list[dict], excluded_room_ids: set[str] | None = None) -> dict | None`

Finds the matching room with the smallest sufficient total capacity. A
candidate must have the requested `type`, have capacity at least
`required_capacity`, and have an ID different from both `unavailable_room_id`
and every ID in `excluded_room_ids`.

Returns the original room dictionary, or `None` if there is no matching room.
When multiple candidates have equal minimum capacity, the first one in `rooms`
is returned. Records missing required keys may raise `KeyError`; the API layer
must validate input before calling this function.

Example using the room data, excluding `classroom-102`:

```python
find_alternative_room(
    unavailable_room_id="classroom-101",
    required_capacity=35,
    room_type="classroom",
    rooms=rooms,
    excluded_room_ids={"classroom-102"},
)
```

```python
{
    "id": "classroom-103",
    "building_id": "academic-west",
    "type": "classroom",
    "capacity": 40,
    "occupancy": 38,
}
```

### `Role-B/app/logic/simulate.py` — `run_what_if(rooms: list[dict], schedule: list[dict], *, unavailable_room_id: str | None = None, unavailable_building_id: str | None = None) -> dict`

Simulates a room outage or building outage. Affected classes are processed in
descending `student_count` order, preserving schedule order for equal counts.
The returned `reallocated` and `failed` lists retain the original schedule
order. Exactly one of
`unavailable_room_id` and `unavailable_building_id` must be provided;
otherwise the function raises `ValueError`. For a building outage, every room
whose `building_id` matches is unavailable. Classes scheduled in the affected
room(s) are reallocated with `find_alternative_room`. Each alternative room can
be assigned to only one class during the simulation call. Malformed room or
schedule records with missing keys may raise `KeyError`; the API layer must
validate input before calling this function.

Return shape:

```python
{
    "affected_count": int,
    "unavailable_room_ids": list[str],
    "reallocated": list[{"class_id": str, "new_room_id": str}],
    "failed": list[{
        "class_id": str,
        "reason": "no suitable room",
        "detail": str,
    }],
    "impact": {
        "students_affected": int,
        "students_reallocated": int,
        "students_unplaced": int,
        "reallocation_rate": float,
    },
}
```

`reallocation_rate` is the fraction of affected students who were reallocated
(from `0.0` to `1.0`); it is `0.0` when no students were affected. Failed
classes keep the fixed `reason` and receive a `detail` of `no room of this
type` when no room of the required type and capacity exists, or `all fitting
rooms taken` when suitable rooms existed but were already assigned.

Example for a single-room outage using `classroom-101` and its schedule entries:

```python
run_what_if(
    rooms,
    schedule,
    unavailable_room_id="classroom-101",
)
```

```python
{
    "affected_count": 3,
    "unavailable_room_ids": ["classroom-101"],
    "reallocated": [
        {"class_id": "class-001", "new_room_id": "classroom-105"},
        {"class_id": "class-002", "new_room_id": "classroom-103"},
        {"class_id": "class-003", "new_room_id": "classroom-102"},
    ],
    "failed": [],
    "impact": {
        "students_affected": 75,
        "students_reallocated": 75,
        "students_unplaced": 0,
        "reallocation_rate": 1.0,
    },
}
```

Example for a building-level outage affecting multiple rooms:

```python
run_what_if(
    rooms,
    schedule,
    unavailable_building_id="academic-east",
)
```

```python
{
    "affected_count": 4,
    "unavailable_room_ids": [
        "classroom-101",
        "classroom-102",
        "classroom-104",
    ],
    "reallocated": [
        {"class_id": "class-001", "new_room_id": "classroom-105"},
        {"class_id": "class-003", "new_room_id": "classroom-103"},
    ],
    "failed": [
        {
            "class_id": "class-002",
            "reason": "no suitable room",
            "detail": "all fitting rooms taken",
        },
        {
            "class_id": "class-004",
            "reason": "no suitable room",
            "detail": "all fitting rooms taken",
        },
    ],
    "impact": {
        "students_affected": 99,
        "students_reallocated": 47,
        "students_unplaced": 52,
        "reallocation_rate": 0.47474747474747475,
    },
}
```

### `Role-B/app/logic/dashboard.py` — `get_dashboard_summary(rooms: list[dict]) -> dict`

Calculates utilization for each room and returns aggregate counts for the
dashboard. Rooms whose utilization calculation raises `ValueError` or
`TypeError` are skipped and included in `skipped_rooms`; other rooms continue
to contribute to the summary. `total_rooms` includes skipped records.
`total_buildings` counts distinct string-valued `building_id` fields in the
input records.

Return shape:

```python
{
    "total_rooms": int,
    "total_buildings": int,
    "status_counts": {
        "low": int,
        "normal": int,
        "high": int,
        "overloaded": int,
    },
    "overloaded_rooms": list[dict],
    "skipped_rooms": list[{"id": str | None, "reason": str}],
}
```

Each `overloaded_rooms` item is the original room record augmented with the
calculated `percentage` and `status`, and with `warning` when occupancy
exceeds capacity. Each skipped entry reports the room ID if it is a string,
otherwise `None`, and the caught exception message.

Example using all records in `Role-B/data/mock_rooms.json`:

```python
get_dashboard_summary(rooms)
```

```python
{
    "total_rooms": 15,
    "total_buildings": 6,
    "status_counts": {
        "low": 6,
        "normal": 5,
        "high": 1,
        "overloaded": 3,
    },
    "overloaded_rooms": [
        {
            "id": "classroom-103",
            "building_id": "academic-west",
            "type": "classroom",
            "capacity": 40,
            "occupancy": 38,
            "percentage": 95.0,
            "status": "overloaded",
        },
        {
            "id": "library-quiet",
            "building_id": "library-building",
            "type": "library",
            "capacity": 30,
            "occupancy": 28,
            "percentage": 93.33333333333333,
            "status": "overloaded",
        },
        {
            "id": "admin-meeting",
            "building_id": "administration",
            "type": "admin",
            "capacity": 16,
            "occupancy": 15,
            "percentage": 93.75,
            "status": "overloaded",
        },
    ],
    "skipped_rooms": [],
}
```

## Known limitations

- Allocation compares the required student count with total room capacity,
  not free seats after current occupancy, and the schedule has no time slots.
  **Future fix:** track current occupancy and add time-slot fields to schedule
  records so allocation can consider free capacity and simultaneous use.
- The occupancy used to prefer non-overloaded rooms is a live “right now”
  value, so it is only a soft preference; an overloaded room is still used
  when it is the only fit.
  **Future fix:** calculate availability for the scheduled time from
  time-indexed occupancy data.
- A small class can be assigned to a much larger room because a smaller
  overloaded room is skipped when a non-overloaded alternative fits.
  **Future fix:** once occupancy and schedules are time-aware, optimize
  placement against available seats and minimize unused capacity.
- Double-booking protection applies only within one `run_what_if` call.
  **Future fix:** persist reservations and check them across simulation calls
  for overlapping time slots.
- Allocation is greedy: it picks the smallest sufficient eligible room for
  each class in descending student-count order (ties retain schedule order),
  so the result is not guaranteed to be optimal. Output lists retain schedule
  order.
  **Future fix:** evaluate allocations globally with an optimizer or
  backtracking strategy.

## Edge cases and errors

- `run_what_if` raises `ValueError` if neither outage ID or both outage IDs are
  supplied.
- An `unavailable_room_id` must match a room's `id`, and an
  `unavailable_building_id` must match at least one room's `building_id`.
  Unknown IDs raise `NotFoundError`, a `ValueError` subclass, with a message
  identifying the missing room or building; map this exception to HTTP 404.
- A known room or building with no scheduled classes is valid. The function
  returns `affected_count: 0`, the matching `unavailable_room_ids`, and empty
  `reallocated` and `failed` lists.
- Other `ValueError` and `TypeError` exceptions indicate invalid input and are
  suitable for mapping to HTTP 400 responses.
- Reallocation first avoids rooms whose utilization status is `overloaded`.
  If no other suitable room exists, it retries while excluding only already
  assigned rooms, so an overloaded room may still be used.

## HTTP API

The API base URL is `http://localhost:8000`. Interactive OpenAPI documentation
is available at `http://localhost:8000/docs`. Response examples were generated
by requests to the running app. Role C router errors use
`{"detail": "..."}`; Role B's pre-existing routes retain their own error
envelopes.

### `GET /rooms/{room_id}/utilization`

- **Path parameter:** `room_id` (`str`, required).
- **Request body:** none.
- **Success (`200`):** result of `calculate_utilization`.

Running API response:

```json
{"percentage":30.0,"status":"low"}
```

- Over-capacity response captured from the running endpoint:

```json
{"percentage":102.5,"status":"overloaded","warning":"occupancy exceeds capacity"}
```

- **`404` unknown room ID:**

```json
{"detail":"room ID 'missing-room' was not found"}
```

- **`400` invalid room utilization data (example: boolean capacity):**

```json
{"detail":"capacity must be a number"}
```

### `GET /dashboard/summary`

- **Path parameters:** none.
- **Request body:** none.
- **Success (`200`):** dashboard summary as described by
  `get_dashboard_summary`.

Running API response:

```json
{"total_rooms":15,"total_buildings":6,"status_counts":{"low":5,"normal":6,"high":1,"overloaded":3},"overloaded_rooms":[{"id":"admin-meeting","building_id":"administration","type":"admin","capacity":16,"occupancy":15,"percentage":93.75,"status":"overloaded","warning":null},{"id":"classroom-103","building_id":"academic-west","type":"classroom","capacity":40,"occupancy":38,"percentage":95.0,"status":"overloaded","warning":null},{"id":"library-quiet","building_id":"library-building","type":"library","capacity":30,"occupancy":28,"percentage":93.33333333333333,"status":"overloaded","warning":null}],"skipped_rooms":[]}
```

At capture time, the running database had `library-main` occupancy `90`;
the canonical fixture has `36`. This accounts for the live response's
`5` low / `6` normal counts versus the fixture-based logic example's
`6` low / `5` normal counts. Running `python -m app.seed` from `Role-B/`
reconciles database rows with the canonical fixtures.

- **`400` if a `ValueError` or `TypeError` escapes the data source/API call:**

```json
{"detail":"invalid data source"}
```

Malformed room utilization records are normally skipped by
`get_dashboard_summary`; this example represents an error raised by the data
source rather than an individual malformed room.

### `POST /simulate/what-if`

- **Path parameters:** none.
- **Request body:** JSON object with:
  - `unavailable_room_id` (`str`, optional and nullable)
  - `unavailable_building_id` (`str`, optional and nullable)
- Exactly one of the two IDs must have a non-null value.
- **Success (`200`):** simulation result.

TestClient request:

```json
{"unavailable_building_id":"academic-east"}
```

Running API response:

```json
{"affected_count":4,"unavailable_room_ids":["classroom-101","classroom-102","classroom-104"],"reallocated":[{"class_id":"class-001","new_room_id":"classroom-105"},{"class_id":"class-003","new_room_id":"classroom-103"}],"failed":[{"class_id":"class-002","reason":"no suitable room","detail":"all fitting rooms taken"},{"class_id":"class-004","reason":"no suitable room","detail":"all fitting rooms taken"}],"impact":{"students_affected":99,"students_reallocated":47,"students_unplaced":52,"reallocation_rate":0.47474747474747475}}
```

- **`404` unknown room or building ID (building example):**

```json
{"detail":"building ID 'missing-building' was not found"}
```

- **`400` if neither or both IDs are supplied:**

```json
{"detail":"provide exactly one of unavailable_room_id or unavailable_building_id"}
```

Invalid request body fields are also mapped to `400`.

### `POST /allocation/alternative`

- **Path parameters:** none.
- **Request body:** JSON object with:
  - `unavailable_room_id` (`str`, required)
  - `required_capacity` (`int`, required)
  - `room_type` (`str`, required)
  - `excluded_room_ids` (`list[str]`, optional; defaults to `[]`)
- **Success (`200`):** the matching room record, or JSON `null` if no room
  qualifies.

TestClient request:

```json
{"unavailable_room_id":"classroom-101","required_capacity":35,"room_type":"classroom","excluded_room_ids":["classroom-102"]}
```

TestClient response:

```json
{"id":"classroom-103","building_id":"academic-west","type":"classroom","capacity":40,"occupancy":38}
```

The no-match success response is:

```json
null
```

- **`404` if `unavailable_room_id` does not identify a room:**

```json
{"detail":"room ID 'missing-room' was not found"}
```

- **`400` request validation example (missing `required_capacity`):**

```json
{"detail":"required_capacity: Field required"}
```

### HTTP error mapping

Unknown room/building IDs return `404` with `NotFoundError` details. Other
invalid input, including request validation errors, maps to `400`. For
`/dashboard/summary`, the shown `400` applies only if a `ValueError` or
`TypeError` escapes the source/API call; malformed room utilization records
are handled as skipped records by the dashboard logic.

## Role B live endpoints

These existing Role B routes are also served by the application. IDs are
strings. All path parameters below are required unless noted; only
`PATCH /rooms/{room_id}/occupancy` accepts a body.

Role B errors retain their existing envelope: 404 responses have
`{"error":"Not found","detail":"..."}`. Request validation errors return
422 with an `error` field and a textual `detail`. This differs from the Role C
router's 400/404 `{"detail":"..."}` format.

### `GET /health`

- **Request:** no path parameters, query parameters, or body.
- **Success (`200`):**

```json
{"status":"ok","database":"connected"}
```

- **`503` database unavailable:** the backend returns an error object with
  `error: "Database unavailable"` and a detail string.

### `GET /rooms`

- **Query parameters:** `building_id` (`str`, optional) and `type` (`str`,
  optional). No body.
- **Success (`200`):** list of rooms with `id`, `building_id`, `type`,
  `capacity`, `occupancy`, and `last_updated`.

Example request: `GET /rooms?building_id=academic-east`

```json
[{"id":"classroom-101","building_id":"academic-east","type":"classroom","capacity":40,"occupancy":12,"last_updated":"2026-11-11T11:58:19.014836"},{"id":"classroom-102","building_id":"academic-east","type":"classroom","capacity":40,"occupancy":24,"last_updated":"2026-11-11T08:58:44.473164"},{"id":"classroom-104","building_id":"academic-east","type":"classroom","capacity":8,"occupancy":2,"last_updated":"2026-11-11T08:58:44.473758"}]
```

### `GET /buildings`

- **Request:** no path parameters, query parameters, or body.
- **Success (`200`):** list of `{id: str, name: str}`.

```json
[{"id":"academic-east","name":"Academic East"},{"id":"academic-west","name":"Academic West"},{"id":"administration","name":"Administration"},{"id":"library-building","name":"Library"},{"id":"science-east","name":"Science East"},{"id":"science-west","name":"Science West"}]
```

### `GET /buildings/{building_id}/rooms`

- **Path parameter:** `building_id` (`str`, required). No query parameters or
  body.
- **Success (`200`):** list of room records with `last_updated`, as in
  `GET /rooms`.
- **`404` unknown building:** `{"error":"Not found","detail":"Building 'missing-building' was not found"}`.

The running API returned the same three `academic-east` rooms shown in the
`GET /rooms?building_id=academic-east` example.

### `GET /rooms/{room_id}`

- **Path parameter:** `room_id` (`str`, required). No query parameters or
  body.
- **Success (`200`):** room record including `last_updated` and
  `schedule_entries`.

```json
{"id":"classroom-101","building_id":"academic-east","type":"classroom","capacity":40,"occupancy":12,"last_updated":"2026-11-11T11:58:19.014836","schedule_entries":[{"class_id":"class-001","room_id":"classroom-101","student_count":12,"type":"classroom"},{"class_id":"class-002","room_id":"classroom-101","student_count":28,"type":"classroom"},{"class_id":"class-003","room_id":"classroom-101","student_count":35,"type":"classroom"}]}
```

- **`404` unknown room:** `{"error":"Not found","detail":"Room 'missing-room' was not found"}`.

### `PATCH /rooms/{room_id}/occupancy`

- **Path parameter:** `room_id` (`str`, required).
- **Request body:** `current_occupancy` (`int`, required, non-negative).
- **Success (`200`):** updated room with `last_updated`.

Example request:

```json
{"current_occupancy":12}
```

Example response:

```json
{"id":"classroom-101","building_id":"academic-east","type":"classroom","capacity":40,"occupancy":12,"last_updated":"2026-11-11T11:58:57.393845"}
```

- **`404` unknown room:** `{"error":"Not found","detail":"Room 'missing-room' was not found"}`.
- **`422` invalid request (negative occupancy):** body contains
  `{"error":"Validation error","detail":"..."}`. The current backend accepts
  occupancy values above capacity; this endpoint does not reject them.

### `GET /schedule`

- **Query parameter:** `room_id` (`str`, optional). No body.
- **Success (`200`):** list of `{class_id: str, room_id: str,
  student_count: int, type: str}`.

Example request: `GET /schedule?room_id=classroom-101`

```json
[{"class_id":"class-001","room_id":"classroom-101","student_count":12,"type":"classroom"},{"class_id":"class-002","room_id":"classroom-101","student_count":28,"type":"classroom"},{"class_id":"class-003","room_id":"classroom-101","student_count":35,"type":"classroom"}]
```

- **`404` unknown room ID:** `{"error":"Not found","detail":"Room 'missing-room' was not found"}`.
