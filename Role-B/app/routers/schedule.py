from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import ClassSchedule, Room
from ..schemas import ScheduleOut

router = APIRouter(tags=["Schedule"])

@router.get("/schedule", response_model=list[ScheduleOut], summary="List schedule entries")
def list_schedule(room_id: str | None = Query(default=None, examples=["classroom-101"]), db: Session = Depends(get_db)):
    if room_id and not db.get(Room, room_id):
        raise HTTPException(status_code=404, detail=f"Room '{room_id}' was not found")
    stmt = select(ClassSchedule).order_by(ClassSchedule.class_id)
    if room_id:
        stmt = stmt.where(ClassSchedule.room_id == room_id)
    return db.scalars(stmt).all()
