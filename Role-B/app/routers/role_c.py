from typing import Literal

from fastapi import APIRouter, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from pydantic import BaseModel, ConfigDict, Field

from .. import data_source
from ..logic.allocation import find_alternative_room
from ..logic.dashboard import get_dashboard_summary
from ..logic.errors import NotFoundError
from ..logic.simulate import run_what_if
from ..logic.utilization import calculate_utilization


def _validation_detail(error: RequestValidationError) -> str:
    return "; ".join(
        f"{'.'.join(str(part) for part in item['loc'] if part != 'body')}: "
        f"{item['msg']}"
        for item in error.errors()
    )


class RoleCRoute(APIRoute):
    def get_route_handler(self):
        original_handler = super().get_route_handler()

        async def route_handler(request: Request):
            try:
                return await original_handler(request)
            except NotFoundError as error:
                return JSONResponse(
                    status_code=404,
                    content={"detail": str(error)},
                )
            except RequestValidationError as error:
                return JSONResponse(
                    status_code=400,
                    content={"detail": _validation_detail(error)},
                )
            except (TypeError, ValueError) as error:
                return JSONResponse(
                    status_code=400,
                    content={"detail": str(error)},
                )

        return route_handler


router = APIRouter(route_class=RoleCRoute, tags=["Role C"])


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


class WhatIfRequest(RequestBody):
    unavailable_room_id: str | None = None
    unavailable_building_id: str | None = None


class AlternativeRoomRequest(RequestBody):
    unavailable_room_id: str
    required_capacity: int
    room_type: str
    excluded_room_ids: list[str] = Field(default_factory=list)


@router.get(
    "/rooms/{room_id}/utilization",
    response_model=UtilizationResponse,
    response_model_exclude_none=True,
    responses={400: {"description": "Invalid room data"}, 404: {"description": "Unknown room ID"}},
)
def room_utilization(room_id: str) -> dict:
    rooms = data_source.get_rooms()
    room = next((candidate for candidate in rooms if candidate.get("id") == room_id), None)
    if room is None:
        raise NotFoundError(f"room ID {room_id!r} was not found")
    return calculate_utilization(room)


@router.get(
    "/dashboard/summary",
    response_model=DashboardSummaryResponse,
    responses={400: {"description": "Invalid room data"}},
)
def dashboard_summary() -> dict:
    return get_dashboard_summary(data_source.get_rooms())


@router.post(
    "/simulate/what-if",
    response_model=WhatIfResponse,
    responses={
        400: {"description": "Invalid simulation input"},
        404: {"description": "Unknown room or building ID"},
    },
)
def simulate_what_if(request: WhatIfRequest) -> dict:
    return run_what_if(
        data_source.get_rooms(),
        data_source.get_schedule(),
        unavailable_room_id=request.unavailable_room_id,
        unavailable_building_id=request.unavailable_building_id,
    )


@router.post(
    "/allocation/alternative",
    response_model=RoomResponse | None,
    responses={
        400: {"description": "Invalid allocation input"},
        404: {"description": "Unknown room ID"},
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
