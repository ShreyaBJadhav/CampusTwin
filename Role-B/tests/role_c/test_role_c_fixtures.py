import json
from pathlib import Path

from app.logic.utilization import calculate_utilization


DATA_DIR = Path(__file__).resolve().parents[2] / "data"


def load_fixture(name: str) -> list[dict]:
    with (DATA_DIR / name).open(encoding="utf-8") as fixture_file:
        return json.load(fixture_file)


def test_labs_are_fewer_than_classrooms_overall_and_per_building():
    rooms = load_fixture("mock_rooms.json")
    classrooms = [room for room in rooms if room["type"] == "classroom"]
    labs = [room for room in rooms if room["type"] == "lab"]

    assert len(rooms) <= 20
    assert len(labs) < len(classrooms)
    lab_statuses = {calculate_utilization(room)["status"] for room in labs}
    assert "low" in lab_statuses
    assert "high" in lab_statuses
    for building_id in {room["building_id"] for room in classrooms}:
        building_classrooms = [
            room
            for room in classrooms
            if room["building_id"] == building_id
        ]
        building_labs = [
            room for room in labs if room["building_id"] == building_id
        ]
        assert len(building_labs) < len(building_classrooms)


def test_room_and_class_ids_are_unique_strings():
    rooms = load_fixture("mock_rooms.json")
    schedule = load_fixture("mock_schedule.json")
    ids = [room["id"] for room in rooms] + [
        entry["class_id"] for entry in schedule
    ]

    assert all(isinstance(identifier, str) for identifier in ids)
    assert len(ids) == len(set(ids))


def test_every_schedule_room_exists_and_has_matching_type():
    rooms = load_fixture("mock_rooms.json")
    schedule = load_fixture("mock_schedule.json")
    rooms_by_id = {room["id"]: room for room in rooms}

    assert all(entry["room_id"] in rooms_by_id for entry in schedule)
    assert all(
        entry["type"] == rooms_by_id[entry["room_id"]]["type"]
        for entry in schedule
    )
