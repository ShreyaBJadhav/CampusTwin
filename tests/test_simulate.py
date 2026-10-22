import pytest

from app.errors import NotFoundError
from app.simulate import run_what_if


def test_run_what_if_reallocates_multiple_affected_classes():
    rooms = [
        {"id": "unavailable", "type": "classroom", "capacity": 40},
        {"id": "alternative-small", "type": "classroom", "capacity": 30},
        {"id": "alternative-large", "type": "classroom", "capacity": 45},
    ]
    schedule = [
        {
            "class_id": "class-1",
            "room_id": "unavailable",
            "student_count": 25,
            "type": "classroom",
        },
        {
            "class_id": "class-2",
            "room_id": "unavailable",
            "student_count": 40,
            "type": "classroom",
        },
        {
            "class_id": "class-3",
            "room_id": "other-room",
            "student_count": 20,
            "type": "classroom",
        },
    ]

    assert run_what_if(
        rooms, schedule, unavailable_room_id="unavailable"
    ) == {
        "affected_count": 2,
        "unavailable_room_ids": ["unavailable"],
        "reallocated": [
            {"class_id": "class-1", "new_room_id": "alternative-small"},
            {"class_id": "class-2", "new_room_id": "alternative-large"},
        ],
        "failed": [],
    }


def test_run_what_if_reports_classes_with_no_suitable_room():
    rooms = [
        {"id": "unavailable", "type": "classroom", "capacity": 40},
        {"id": "alternative", "type": "classroom", "capacity": 30},
    ]
    schedule = [
        {
            "class_id": "class-1",
            "room_id": "unavailable",
            "student_count": 35,
            "type": "classroom",
        },
        {
            "class_id": "class-2",
            "room_id": "unavailable",
            "student_count": 20,
            "type": "classroom",
        },
    ]

    assert run_what_if(
        rooms, schedule, unavailable_room_id="unavailable"
    ) == {
        "affected_count": 2,
        "unavailable_room_ids": ["unavailable"],
        "reallocated": [
            {"class_id": "class-2", "new_room_id": "alternative"},
        ],
        "failed": [{"class_id": "class-1", "reason": "no suitable room"}],
    }


def test_run_what_if_handles_building_outage_across_multiple_rooms():
    rooms = [
        {
            "id": "unavailable-1",
            "building_id": "building-1",
            "type": "classroom",
            "capacity": 40,
        },
        {
            "id": "unavailable-2",
            "building_id": "building-1",
            "type": "classroom",
            "capacity": 30,
        },
        {
            "id": "alternative",
            "building_id": "building-2",
            "type": "classroom",
            "capacity": 45,
        },
        {
            "id": "alternative-2",
            "building_id": "building-2",
            "type": "classroom",
            "capacity": 50,
        },
    ]
    schedule = [
        {
            "class_id": "class-1",
            "room_id": "unavailable-1",
            "student_count": 35,
            "type": "classroom",
        },
        {
            "class_id": "class-2",
            "room_id": "unavailable-2",
            "student_count": 25,
            "type": "classroom",
        },
        {
            "class_id": "class-3",
            "room_id": "alternative",
            "student_count": 40,
            "type": "classroom",
        },
    ]

    assert run_what_if(
        rooms, schedule, unavailable_building_id="building-1"
    ) == {
        "affected_count": 2,
        "unavailable_room_ids": ["unavailable-1", "unavailable-2"],
        "reallocated": [
            {"class_id": "class-1", "new_room_id": "alternative"},
            {"class_id": "class-2", "new_room_id": "alternative-2"},
        ],
        "failed": [],
    }


def test_run_what_if_does_not_double_book_alternative_rooms():
    rooms = [
        {"id": "unavailable", "type": "classroom", "capacity": 40},
        {"id": "alternative-1", "type": "classroom", "capacity": 45},
        {"id": "alternative-2", "type": "classroom", "capacity": 50},
    ]
    schedule = [
        {
            "class_id": f"class-{index}",
            "room_id": "unavailable",
            "student_count": 35,
            "type": "classroom",
        }
        for index in range(1, 4)
    ]

    result = run_what_if(
        rooms, schedule, unavailable_room_id="unavailable"
    )

    assert result == {
        "affected_count": 3,
        "unavailable_room_ids": ["unavailable"],
        "reallocated": [
            {"class_id": "class-1", "new_room_id": "alternative-1"},
            {"class_id": "class-2", "new_room_id": "alternative-2"},
        ],
        "failed": [{"class_id": "class-3", "reason": "no suitable room"}],
    }


def test_run_what_if_prefers_non_overloaded_room():
    rooms = [
        {"id": "unavailable", "type": "classroom", "capacity": 40, "occupancy": 10},
        {"id": "smaller-overloaded", "type": "classroom", "capacity": 20, "occupancy": 19},
        {"id": "larger-normal", "type": "classroom", "capacity": 30, "occupancy": 20},
    ]
    schedule = [
        {
            "class_id": "class-1",
            "room_id": "unavailable",
            "student_count": 15,
            "type": "classroom",
        },
    ]

    result = run_what_if(rooms, schedule, unavailable_room_id="unavailable")

    assert result["reallocated"] == [
        {"class_id": "class-1", "new_room_id": "larger-normal"},
    ]
    assert result["failed"] == []


def test_run_what_if_uses_overloaded_room_when_it_is_the_only_fit():
    rooms = [
        {"id": "unavailable", "type": "classroom", "capacity": 40, "occupancy": 10},
        {"id": "overloaded-fit", "type": "classroom", "capacity": 20, "occupancy": 19},
        {"id": "too-small", "type": "classroom", "capacity": 10, "occupancy": 5},
    ]
    schedule = [
        {
            "class_id": "class-1",
            "room_id": "unavailable",
            "student_count": 15,
            "type": "classroom",
        },
    ]

    result = run_what_if(rooms, schedule, unavailable_room_id="unavailable")

    assert result["reallocated"] == [
        {"class_id": "class-1", "new_room_id": "overloaded-fit"},
    ]
    assert result["failed"] == []


def test_run_what_if_requires_exactly_one_outage_identifier():
    rooms = []
    schedule = []

    with pytest.raises(ValueError, match="provide exactly one"):
        run_what_if(rooms, schedule)
    with pytest.raises(ValueError, match="provide exactly one"):
        run_what_if(
            rooms,
            schedule,
            unavailable_room_id="room-1",
            unavailable_building_id="building-1",
        )


def test_run_what_if_rejects_unknown_room_id():
    rooms = [{"id": "room-1", "building_id": "building-1"}]

    with pytest.raises(NotFoundError, match="room ID 'missing-room' was not found"):
        run_what_if(rooms, [], unavailable_room_id="missing-room")


def test_run_what_if_rejects_unknown_building_id():
    rooms = [{"id": "room-1", "building_id": "building-1"}]

    with pytest.raises(
        NotFoundError, match="building ID 'missing-building' was not found"
    ):
        run_what_if(rooms, [], unavailable_building_id="missing-building")


def test_run_what_if_allows_existing_room_without_scheduled_classes():
    rooms = [{"id": "room-1", "building_id": "building-1"}]

    assert run_what_if(
        rooms, [], unavailable_room_id="room-1"
    ) == {
        "affected_count": 0,
        "unavailable_room_ids": ["room-1"],
        "reallocated": [],
        "failed": [],
    }


def test_run_what_if_allows_existing_building_without_scheduled_classes():
    rooms = [{"id": "room-1", "building_id": "building-1"}]

    assert run_what_if(
        rooms, [], unavailable_building_id="building-1"
    ) == {
        "affected_count": 0,
        "unavailable_room_ids": ["room-1"],
        "reallocated": [],
        "failed": [],
    }
