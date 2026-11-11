from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Building, Room
from ..schemas import BuildingOut, RoomOut

router = APIRouter(tags=["Buildings"])

@router.get("/buildings", response_model=list[BuildingOut], summary="List buildings")
def list_buildings(db: Session = Depends(get_db)):
    return db.scalars(select(Building).order_by(Building.id)).all()

@router.get("/buildings/{building_id}/rooms", response_model=list[RoomOut], summary="List rooms in a building")
def building_rooms(building_id: str, db: Session = Depends(get_db)):
    if not db.get(Building, building_id):
        raise HTTPException(status_code=404, detail=f"Building '{building_id}' was not found")
    return db.scalars(select(Room).where(Room.building_id == building_id).order_by(Room.id)).all()
