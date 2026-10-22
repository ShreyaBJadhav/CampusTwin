import pytest

from app.utilization import calculate_utilization


@pytest.mark.parametrize(
    ("occupancy", "expected_status"),
    [
        (0, "low"),
        (39, "low"),
        (40, "normal"),
        (75, "normal"),
        (76, "high"),
        (90, "high"),
        (91, "overloaded"),
        (100, "overloaded"),
    ],
)
def test_calculate_utilization_status_boundaries(occupancy, expected_status):
    result = calculate_utilization({"capacity": 100, "occupancy": occupancy})

    assert result == {
        "percentage": float(occupancy),
        "status": expected_status,
    }


def test_calculate_utilization_flags_occupancy_above_capacity():
    assert calculate_utilization({"capacity": 10, "occupancy": 11}) == {
        "percentage": 110.0,
        "status": "overloaded",
        "warning": "occupancy exceeds capacity",
    }


@pytest.mark.parametrize(
    "room",
    [
        {"capacity": 0, "occupancy": 0},
        {"capacity": 10, "occupancy": -1},
        {"capacity": 10},
    ],
)
def test_calculate_utilization_rejects_invalid_room_data(room):
    with pytest.raises(ValueError):
        calculate_utilization(room)