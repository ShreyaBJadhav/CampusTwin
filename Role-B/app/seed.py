import json
from pathlib import Path
from sqlalchemy import select
from .database import Base, engine, SessionLocal
from .models import Building, Room, ClassSchedule

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
BUILDING_NAMES = {
    "academic-east": "Academic East",
    "academic-west": "Academic West",
    "science-east": "Science East",
    "library-building": "Library",
    "administration": "Administration",
}

def seed_database():
    Base.metadata.create_all(bind=engine)
    rooms = json.loads((DATA / "mock_rooms.json").read_text(encoding="utf-8"))
    schedule = json.loads((DATA / "mock_schedule.json").read_text(encoding="utf-8"))
    building_ids = sorted({room["building_id"] for room in rooms})
    with SessionLocal() as db:
        for building_id in building_ids:
            db.merge(Building(id=building_id, name=BUILDING_NAMES.get(building_id, building_id.replace("-", " ").title())))
        db.flush()
        for item in rooms:
            db.merge(Room(**item))
        db.flush()
        valid_room_ids = {r["id"] for r in rooms}
        for item in schedule:
            if item["room_id"] in valid_room_ids:
                db.merge(ClassSchedule(**item))
        db.commit()
    return {"buildings": len(building_ids), "rooms": len(rooms), "schedule_entries": sum(1 for x in schedule if x["room_id"] in {r["id"] for r in rooms})}

if __name__ == "__main__":
    print("Seed complete:", seed_database())
