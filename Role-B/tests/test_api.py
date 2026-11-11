import json
import os
from pathlib import Path

from fastapi.testclient import TestClient


DATA_DIR = Path(__file__).resolve().parents[1] / "data"


def fixture_counts():
    rooms = json.loads((DATA_DIR / "mock_rooms.json").read_text(encoding="utf-8"))
    building_count = len({room["building_id"] for room in rooms})
    return len(rooms), building_count


def load_room_fixtures():
    return {
        room["id"]: room
        for room in json.loads(
            (DATA_DIR / "mock_rooms.json").read_text(encoding="utf-8")
        )
    }


def make_client(tmp_path):
    db_path = tmp_path / "test.db"
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"
    # Reload app modules so the engine uses the temporary database.
    import importlib
    import app.database as database
    import app.models as models
    import app.main as main
    import app.seed as seed
    importlib.reload(database)
    importlib.reload(models)
    importlib.reload(seed)
    importlib.reload(main)
    seed.seed_database()
    return TestClient(main.app)

def test_endpoints_and_over_capacity(tmp_path):
    client = make_client(tmp_path)
    room_count, building_count = fixture_counts()
    room_fixtures = load_room_fixtures()
    assert client.get("/health").status_code == 200
    assert len(client.get("/rooms").json()) == room_count
    assert len(client.get("/buildings").json()) == building_count
    assert client.get("/rooms?building_id=academic-east").status_code == 200
    assert client.get("/rooms?type=lab").status_code == 200
    detail = client.get("/rooms/classroom-101")
    assert detail.status_code == 200 and "schedule_entries" in detail.json()
    assert client.get("/buildings/academic-east/rooms").status_code == 200
    assert client.get("/buildings/missing/rooms").status_code == 404
    assert client.get("/rooms/not-real").status_code == 404
    assert client.get("/schedule").status_code == 200
    assert client.get("/schedule?room_id=classroom-101").status_code == 200
    over = client.get("/rooms/admin-meeting").json()
    assert over["occupancy"] == room_fixtures["admin-meeting"]["occupancy"]
    assert over["capacity"] == room_fixtures["admin-meeting"]["capacity"]
    updated = client.patch("/rooms/classroom-101/occupancy", json={"current_occupancy": 50})
    assert updated.status_code == 200 and updated.json()["occupancy"] == 50
    assert client.get("/rooms/classroom-101").json()["occupancy"] == 50
    assert client.patch("/rooms/classroom-101/occupancy", json={"current_occupancy": -1}).status_code == 422
    assert client.patch("/rooms/no-such-room/occupancy", json={"current_occupancy": 1}).status_code == 404
