import json
import os
from pathlib import Path

from sqlalchemy import select

from .database import SessionLocal
from .models import ClassSchedule, Room


_DATA_DIR = Path(__file__).resolve().parents[1] / "data"
USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "false").strip().lower() in {
    "1",
    "true",
    "yes",
}


def _read_mock_data(filename: str) -> list[dict]:
    with (_DATA_DIR / filename).open(encoding="utf-8") as data_file:
        return json.load(data_file)


def get_rooms() -> list[dict]:
    if USE_MOCK_DATA:
        return _read_mock_data("mock_rooms.json")

    with SessionLocal() as db:
        rooms = db.scalars(select(Room).order_by(Room.id)).all()
        return [
            {
                "id": str(room.id),
                "building_id": str(room.building_id),
                "type": room.type,
                "capacity": int(room.capacity),
                "occupancy": int(room.occupancy),
            }
            for room in rooms
        ]


def get_schedule() -> list[dict]:
    if USE_MOCK_DATA:
        return _read_mock_data("mock_schedule.json")

    with SessionLocal() as db:
        schedule = db.scalars(select(ClassSchedule).order_by(ClassSchedule.class_id)).all()
        return [
            {
                "class_id": str(entry.class_id),
                "room_id": str(entry.room_id),
                "student_count": int(entry.student_count),
                "type": entry.type,
            }
            for entry in schedule
        ]
