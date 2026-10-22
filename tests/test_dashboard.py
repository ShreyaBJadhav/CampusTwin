from app.dashboard import get_dashboard_summary


def test_get_dashboard_summary_for_empty_room_list():
    assert get_dashboard_summary([]) == {
        "total_rooms": 0,
        "total_buildings": 0,
        "status_counts": {
            "low": 0,
            "normal": 0,
            "high": 0,
            "overloaded": 0,
        },
        "overloaded_rooms": [],
        "skipped_rooms": [],
    }


def test_get_dashboard_summary_counts_all_utilization_statuses():
    rooms = [
        {"id": "room-low", "building_id": "building-1", "capacity": 100, "occupancy": 20},
        {"id": "room-normal", "building_id": "building-1", "capacity": 100, "occupancy": 50},
        {"id": "room-high", "building_id": "building-2", "capacity": 100, "occupancy": 80},
        {"id": "room-overloaded", "building_id": "building-3", "capacity": 100, "occupancy": 95},
    ]

    result = get_dashboard_summary(rooms)

    assert result["total_rooms"] == 4
    assert result["total_buildings"] == 3
    assert result["status_counts"] == {
        "low": 1,
        "normal": 1,
        "high": 1,
        "overloaded": 1,
    }
    assert result["overloaded_rooms"] == [
        {
            "id": "room-overloaded",
            "building_id": "building-3",
            "capacity": 100,
            "occupancy": 95,
            "percentage": 95.0,
            "status": "overloaded",
        }
    ]
    assert result["skipped_rooms"] == []


def test_get_dashboard_summary_with_no_overloaded_rooms():
    rooms = [
        {"id": "room-low", "building_id": "building-1", "capacity": 100, "occupancy": 20},
        {"id": "room-normal", "building_id": "building-2", "capacity": 100, "occupancy": 50},
        {"id": "room-high", "building_id": "building-3", "capacity": 100, "occupancy": 80},
    ]

    result = get_dashboard_summary(rooms)

    assert result["status_counts"] == {
        "low": 1,
        "normal": 1,
        "high": 1,
        "overloaded": 0,
    }
    assert result["overloaded_rooms"] == []


def test_get_dashboard_summary_skips_malformed_room():
    rooms = [
        {"id": "valid-room", "building_id": "building-1", "capacity": 100, "occupancy": 20},
        {"id": "malformed-room", "building_id": "building-2", "occupancy": 10},
    ]

    result = get_dashboard_summary(rooms)

    assert result["total_rooms"] == 2
    assert result["total_buildings"] == 2
    assert result["status_counts"] == {
        "low": 1,
        "normal": 0,
        "high": 0,
        "overloaded": 0,
    }
    assert result["skipped_rooms"] == [
        {
            "id": "malformed-room",
            "reason": "room must include capacity and occupancy",
        }
    ]


def test_get_dashboard_summary_uses_none_for_non_string_skipped_room_id():
    rooms = [
        {"id": 123, "building_id": "building-1", "occupancy": 10},
    ]

    result = get_dashboard_summary(rooms)

    assert result["skipped_rooms"] == [
        {
            "id": None,
            "reason": "room must include capacity and occupancy",
        }
    ]
