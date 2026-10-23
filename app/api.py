from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

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


class WhatIfRequest(RequestBody):
    unavailable_room_id: str | None = None
    unavailable_building_id: str | None = None


class AlternativeRoomRequest(RequestBody):
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
    return JSONResponse(status_code=400, content={"detail": str(error)})


@app.get("/rooms/{room_id}/utilization")
def room_utilization(room_id: str) -> dict:
    rooms = data_source.get_rooms()
    room = next(
        (candidate for candidate in rooms if candidate.get("id") == room_id),
        None,
    )
    if room is None:
        raise NotFoundError(f"room ID {room_id!r} was not found")
    return calculate_utilization(room)


@app.get("/dashboard/summary")
def dashboard_summary() -> dict:
    return get_dashboard_summary(data_source.get_rooms())


@app.post("/simulate/what-if")
def simulate_what_if(request: WhatIfRequest) -> dict:
    return run_what_if(
        data_source.get_rooms(),
        data_source.get_schedule(),
        unavailable_room_id=request.unavailable_room_id,
        unavailable_building_id=request.unavailable_building_id,
    )


@app.post("/allocation/alternative")
def alternative_room(request: AlternativeRoomRequest) -> dict | None:
    return find_alternative_room(
        request.unavailable_room_id,
        request.required_capacity,
        request.room_type,
        data_source.get_rooms(),
        excluded_room_ids=set(request.excluded_room_ids),
    )
