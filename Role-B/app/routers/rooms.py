from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from ..database import get_db
from ..models import Room, ClassSchedule
from ..schemas import RoomOut, OccupancyUpdate, ScheduleOut

router = APIRouter(tags=["Rooms"])

@router.get("/rooms", response_model=list[RoomOut], summary="List rooms")
def list_rooms(building_id: str | None = Query(default=None, examples=["academic-east"]),
               type: str | None = Query(default=None, examples=["classroom"]),
               db: Session = Depends(get_db)):
    stmt = select(Room).order_by(Room.id)
    if building_id:
        stmt = stmt.where(Room.building_id == building_id)
    if type:
        stmt = stmt.where(Room.type == type)
    return db.scalars(stmt).all()

@router.get("/rooms/{room_id}", summary="Get room details and schedule entries")
def get_room(room_id: str, db: Session = Depends(get_db)):
    room = db.scalar(select(Room).options(selectinload(Room.schedule_entries)).where(Room.id == room_id))
    if not room:
        raise HTTPException(status_code=404, detail=f"Room '{room_id}' was not found")
    return {
        "id": room.id, "building_id": room.building_id, "type": room.type,
        "capacity": room.capacity, "occupancy": room.occupancy,
        "last_updated": room.last_updated,
        "schedule_entries": [ScheduleOut.model_validate(x).model_dump() for x in room.schedule_entries]
    }

@router.patch("/rooms/{room_id}/occupancy", response_model=RoomOut, summary="Manually update room occupancy")
def update_occupancy(room_id: str, body: OccupancyUpdate, db: Session = Depends(get_db)):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail=f"Room '{room_id}' was not found")
    room.occupancy = body.current_occupancy
    room.last_updated = datetime.now(timezone.utc)
    db.commit()
    db.refresh(room)
    return room
