from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from typing import Literal

from app import data_source
from app.allocation import find_alternative_room
from app.dashboard import get_dashboard_summary
from app.errors import NotFoundError
from app.simulate import run_what_if
from app.utilization import calculate_utilization


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class RequestBody(BaseModel):
    model_config = ConfigDict(extra="forbid")


class RoomResponse(BaseModel):
    id: str
    building_id: str
    type: str
    capacity: int
    occupancy: int


class UtilizationResponse(BaseModel):
    percentage: float
    status: Literal["low", "normal", "high", "overloaded"]
    warning: str | None = None


class StatusCountsResponse(BaseModel):
    low: int
    normal: int
    high: int
    overloaded: int


class OverloadedRoomResponse(RoomResponse):
    percentage: float
    status: Literal["overloaded"]
    warning: str | None = None


class SkippedRoomResponse(BaseModel):
    id: str | None
    reason: str


class DashboardSummaryResponse(BaseModel):
    total_rooms: int
    total_buildings: int
    status_counts: StatusCountsResponse
    overloaded_rooms: list[OverloadedRoomResponse]
    skipped_rooms: list[SkippedRoomResponse]


class ReallocatedClassResponse(BaseModel):
    class_id: str
    new_room_id: str


class FailedClassResponse(BaseModel):
    class_id: str
    reason: Literal["no suitable room"]
    detail: str | None = None


class ImpactResponse(BaseModel):
    students_affected: int
    students_reallocated: int
    students_unplaced: int
    reallocation_rate: float


class WhatIfResponse(BaseModel):
    affected_count: int
    unavailable_room_ids: list[str]
    reallocated: list[ReallocatedClassResponse]
    failed: list[FailedClassResponse]
    impact: ImpactResponse


class ScheduleEntryResponse(BaseModel):
    class_id: str
    room_id: str
    student_count: int
    type: str


class HealthResponse(BaseModel):
    status: Literal["ok"]


class WhatIfRequest(RequestBody):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {"unavailable_room_id": "classroom-101"},
                {"unavailable_building_id": "academic-east"},
            ]
        },
    )

    unavailable_room_id: str | None = None
    unavailable_building_id: str | None = None


class AlternativeRoomRequest(RequestBody):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "unavailable_room_id": "classroom-101",
                    "required_capacity": 35,
                    "room_type": "classroom",
                    "excluded_room_ids": ["classroom-102"],
                }
            ]
        },
    )

    unavailable_room_id: str
    required_capacity: int
    room_type: str
    excluded_room_ids: list[str] = Field(default_factory=list)


@app.exception_handler(NotFoundError)
async def not_found_error_handler(_, error: NotFoundError) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(error)})


@app.exception_handler(ValueError)
@app.exception_handler(TypeError)
async def invalid_input_error_handler(_, error: ValueError | TypeError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"detail": str(error)})


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(
    _, error: RequestValidationError
) -> JSONResponse:
    details = "; ".join(
        f"{'.'.join(str(part) for part in item['loc'] if part != 'body')}: "
        f"{item['msg']}"
        for item in error.errors()
    )
    return JSONResponse(status_code=400, content={"detail": details})


@app.get(
    "/rooms/{room_id}/utilization",
    response_model=UtilizationResponse,
    response_model_exclude_none=True,
    responses={
        200: {
            "content": {
                "application/json": {
                    "example": {"percentage": 30.0, "status": "low"}
                }
            }
        }
    },
)
def room_utilization(room_id: str) -> dict:
    rooms = data_source.get_rooms()
    room = next(
        (candidate for candidate in rooms if candidate.get("id") == room_id),
        None,
    )
    if room is None:
        raise NotFoundError(f"room ID {room_id!r} was not found")
    return calculate_utilization(room)


@app.get(
    "/dashboard/summary",
    response_model=DashboardSummaryResponse,
    responses={
        200: {
            "content": {
                "application/json": {
                    "example": {
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
                }
            }
        }
    },
)
def dashboard_summary() -> dict:
    return get_dashboard_summary(data_source.get_rooms())


@app.post(
    "/simulate/what-if",
    response_model=WhatIfResponse,
    responses={
        200: {
            "content": {
                "application/json": {
                    "example": {
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
                }
            }
        }
    },
)
def simulate_what_if(request: WhatIfRequest) -> dict:
    return run_what_if(
        data_source.get_rooms(),
        data_source.get_schedule(),
        unavailable_room_id=request.unavailable_room_id,
        unavailable_building_id=request.unavailable_building_id,
    )


@app.post(
    "/allocation/alternative",
    response_model=RoomResponse | None,
    responses={
        200: {
            "content": {
                "application/json": {
                    "example": {
                        "id": "classroom-103",
                        "building_id": "academic-west",
                        "type": "classroom",
                        "capacity": 40,
                        "occupancy": 38,
                    }
                }
            }
        }
    },
)
def alternative_room(request: AlternativeRoomRequest) -> dict | None:
    rooms = data_source.get_rooms()
    if not any(room.get("id") == request.unavailable_room_id for room in rooms):
        raise NotFoundError(
            f"room ID {request.unavailable_room_id!r} was not found"
        )
    return find_alternative_room(
        request.unavailable_room_id,
        request.required_capacity,
        request.room_type,
        rooms,
        excluded_room_ids=set(request.excluded_room_ids),
    )


@app.get("/rooms", response_model=list[RoomResponse])
def rooms() -> list[dict]:
    """Stopgap data endpoint until the database-backed service is available."""
    return data_source.get_rooms()


@app.get("/schedule", response_model=list[ScheduleEntryResponse])
def schedule() -> list[dict]:
    """Stopgap data endpoint until the database-backed service is available."""
    return data_source.get_schedule()


@app.get(
    "/health",
    response_model=HealthResponse,
    responses={
        200: {
            "content": {
                "application/json": {"example": {"status": "ok"}}
            }
        }
    },
)
def health() -> dict:
    return {"status": "ok"}
