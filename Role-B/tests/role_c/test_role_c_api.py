from fastapi.testclient import TestClient

from app import data_source
from app.main import app


client = TestClient(app)


def test_room_utilization_success():
    response = client.get("/rooms/classroom-101/utilization")

    assert response.status_code == 200
    assert response.json() == {"percentage": 30.0, "status": "low"}


def test_room_utilization_unknown_room_returns_404():
    response = client.get("/rooms/missing-room/utilization")

    assert response.status_code == 404
    assert response.json() == {"detail": "room ID 'missing-room' was not found"}


def test_room_utilization_over_capacity_includes_backend_warning(monkeypatch):
    monkeypatch.setattr(
        data_source,
        "get_rooms",
        lambda: [{"id": "test-room", "capacity": 10, "occupancy": 11}],
    )

    response = client.get("/rooms/test-room/utilization")

    assert response.status_code == 200
    assert response.json() == {
        "percentage": 110.0,
        "status": "overloaded",
        "warning": "occupancy exceeds capacity",
    }


def test_dashboard_summary_success():
    response = client.get("/dashboard/summary")

    assert response.status_code == 200
    assert response.json()["total_rooms"] == 15
    assert response.json()["total_buildings"] == 6


def test_dashboard_summary_invalid_data_source_value_returns_400(monkeypatch):
    def raise_invalid_data():
        raise ValueError("invalid room data")

    monkeypatch.setattr(data_source, "get_rooms", raise_invalid_data)

    response = client.get("/dashboard/summary")

    assert response.status_code == 400
    assert response.json() == {"detail": "invalid room data"}


def test_what_if_simulation_success():
    response = client.post(
        "/simulate/what-if",
        json={"unavailable_room_id": "classroom-101"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "affected_count": 3,
        "unavailable_room_ids": ["classroom-101"],
        "reallocated": [
            {"class_id": "class-001", "new_room_id": "classroom-105"},
            {"class_id": "class-002", "new_room_id": "classroom-103"},
            {"class_id": "class-003", "new_room_id": "classroom-102"},
        ],
        "failed": [],
        "impact": {
            "students_affected": 75,
            "students_reallocated": 75,
            "students_unplaced": 0,
            "reallocation_rate": 1.0,
        },
    }


def test_what_if_simulation_missing_outage_identifier_returns_400():
    response = client.post("/simulate/what-if", json={})

    assert response.status_code == 400
    assert response.json() == {
        "detail": "provide exactly one of unavailable_room_id or unavailable_building_id"
    }


def test_alternative_room_success():
    response = client.post(
        "/allocation/alternative",
        json={
            "unavailable_room_id": "classroom-101",
            "required_capacity": 35,
            "room_type": "classroom",
            "excluded_room_ids": ["classroom-102"],
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": "classroom-103",
        "building_id": "academic-west",
        "type": "classroom",
        "capacity": 40,
        "occupancy": 38,
    }


def test_alternative_room_missing_required_field_returns_400():
    response = client.post(
        "/allocation/alternative",
        json={
            "unavailable_room_id": "classroom-101",
            "room_type": "classroom",
        },
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "required_capacity: Field required",
    }


def test_alternative_room_unknown_room_returns_404():
    response = client.post(
        "/allocation/alternative",
        json={
            "unavailable_room_id": "missing-room",
            "required_capacity": 35,
            "room_type": "classroom",
        },
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "room ID 'missing-room' was not found"}


def test_cors_allows_role_a_dev_origin():
    response = client.options(
        "/dashboard/summary",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_openapi_schema_contains_role_c_routes():
    schema = client.get("/openapi.json").json()

    assert {
        "/rooms/{room_id}/utilization",
        "/dashboard/summary",
        "/simulate/what-if",
        "/allocation/alternative",
    } <= set(schema["paths"])
    assert schema["paths"]["/rooms/{room_id}/utilization"]["get"]["responses"]["200"][
        "content"
    ]["application/json"]["schema"]["$ref"] == "#/components/schemas/UtilizationResponse"
    assert schema["paths"]["/dashboard/summary"]["get"]["responses"]["200"][
        "content"
    ]["application/json"]["schema"]["$ref"] == "#/components/schemas/DashboardSummaryResponse"
    assert schema["paths"]["/simulate/what-if"]["post"]["responses"]["200"][
        "content"
    ]["application/json"]["schema"]["$ref"] == "#/components/schemas/WhatIfResponse"
    assert schema["paths"]["/allocation/alternative"]["post"]["responses"]["200"][
        "content"
    ]["application/json"]["schema"]["anyOf"]
