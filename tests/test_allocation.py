from app.allocation import find_alternative_room


def test_find_alternative_room_returns_smallest_sufficient_match():
    rooms = [
        {"id": "unavailable", "type": "classroom", "capacity": 40},
        {"id": "large", "type": "classroom", "capacity": 60},
        {"id": "small", "type": "classroom", "capacity": 30},
        {"id": "best", "type": "classroom", "capacity": 45},
        {"id": "other-type", "type": "lab", "capacity": 42},
    ]

    assert find_alternative_room("unavailable", 40, "classroom", rooms) == {
        "id": "best",
        "type": "classroom",
        "capacity": 45,
    }


def test_find_alternative_room_returns_none_when_no_match_exists():
    rooms = [
        {"id": "too-small", "type": "classroom", "capacity": 20},
        {"id": "wrong-type", "type": "lab", "capacity": 60},
        {"id": "unavailable", "type": "classroom", "capacity": 50},
    ]

    assert find_alternative_room("unavailable", 40, "classroom", rooms) is None


def test_find_alternative_room_returns_only_candidate():
    candidate = {"id": "candidate", "type": "classroom", "capacity": 45}
    rooms = [
        {"id": "unavailable", "type": "classroom", "capacity": 40},
        candidate,
        {"id": "too-small", "type": "classroom", "capacity": 35},
    ]

    assert find_alternative_room("unavailable", 40, "classroom", rooms) is candidate


def test_find_alternative_room_does_not_match_building_type_fallback():
    rooms = [
        {"id": "candidate", "building_type": "classroom", "capacity": 45},
    ]

    assert find_alternative_room("unavailable", 40, "classroom", rooms) is None
