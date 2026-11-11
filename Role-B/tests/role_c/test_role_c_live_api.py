from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_list_rooms_returns_data_source_records():
    response = client.get("/rooms")

    assert response.status_code == 200
    rooms = response.json()
    assert len(rooms) == 15
    classroom = next(room for room in rooms if room["id"] == "classroom-101")
    assert {
        key: classroom[key]
        for key in ("id", "building_id", "type", "capacity", "occupancy")
    } == {
        "id": "classroom-101",
        "building_id": "academic-east",
        "type": "classroom",
        "capacity": 40,
        "occupancy": 12,
    }


def test_list_schedule_returns_data_source_records():
    response = client.get("/schedule")

    assert response.status_code == 200
    schedule = response.json()
    assert len(schedule) == 13
    class_entry = next(entry for entry in schedule if entry["class_id"] == "class-001")
    assert class_entry == {
        "class_id": "class-001",
        "room_id": "classroom-101",
        "student_count": 12,
        "type": "classroom",
    }


def test_health_check_returns_ok():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_openapi_schema_contains_all_api_routes():
    schema = client.get("/openapi.json").json()

    assert {
        "/rooms/{room_id}/utilization",
        "/dashboard/summary",
        "/simulate/what-if",
        "/allocation/alternative",
        "/rooms",
        "/schedule",
        "/health",
    } <= set(schema["paths"])
