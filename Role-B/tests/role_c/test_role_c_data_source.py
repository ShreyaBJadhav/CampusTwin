from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import data_source
from app.database import Base
from app.models import ClassSchedule, Room


def test_database_adapters_return_contract_fields_and_coerce_values(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    test_session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    with test_session() as db:
        db.add(
            Room(
                id="room-1",
                building_id="building-1",
                type="classroom",
                capacity=40,
                occupancy=12,
            )
        )
        db.add(
            ClassSchedule(
                class_id="class-1",
                room_id="room-1",
                student_count=12,
                type="classroom",
            )
        )
        db.commit()

    monkeypatch.setattr(data_source, "SessionLocal", test_session)
    monkeypatch.setattr(data_source, "USE_MOCK_DATA", False)

    assert data_source.get_rooms() == [
        {
            "id": "room-1",
            "building_id": "building-1",
            "type": "classroom",
            "capacity": 40,
            "occupancy": 12,
        }
    ]
    assert data_source.get_schedule() == [
        {
            "class_id": "class-1",
            "room_id": "room-1",
            "student_count": 12,
            "type": "classroom",
        }
    ]
    engine.dispose()
