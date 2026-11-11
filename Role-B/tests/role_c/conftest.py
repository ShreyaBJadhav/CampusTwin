import json
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import data_source
from app.database import Base, get_db
from app.main import app
from app.models import Building, ClassSchedule, Room
import app.main as main_module


@pytest.fixture(autouse=True)
def use_mock_data(monkeypatch):
    monkeypatch.setattr(data_source, "USE_MOCK_DATA", True)


@pytest.fixture(autouse=True)
def isolate_role_b_routes(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    test_session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    data_dir = Path(__file__).resolve().parents[2] / "data"
    rooms = json.loads((data_dir / "mock_rooms.json").read_text(encoding="utf-8"))
    schedule = json.loads(
        (data_dir / "mock_schedule.json").read_text(encoding="utf-8")
    )
    with test_session() as db:
        for building_id in {room["building_id"] for room in rooms}:
            db.add(Building(id=building_id, name=building_id))
        db.add_all(Room(**room) for room in rooms)
        db.add_all(ClassSchedule(**entry) for entry in schedule)
        db.commit()

    def override_get_db():
        with test_session() as db:
            yield db

    monkeypatch.setitem(app.dependency_overrides, get_db, override_get_db)
    monkeypatch.setattr(main_module, "engine", engine)
    yield
    engine.dispose()
