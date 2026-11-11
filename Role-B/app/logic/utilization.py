import math
from numbers import Real


def calculate_utilization(room: dict) -> dict:
    """Calculate a room's utilization percentage and status."""
    if not isinstance(room, dict):
        raise TypeError("room must be a dictionary")
    if "capacity" not in room or "occupancy" not in room:
        raise ValueError("room must include capacity and occupancy")

    capacity = room["capacity"]
    occupancy = room["occupancy"]
    for name, value in (("capacity", capacity), ("occupancy", occupancy)):
        if isinstance(value, bool) or not isinstance(value, Real):
            raise TypeError(f"{name} must be a number")
        if not math.isfinite(value):
            raise ValueError(f"{name} must be finite")

    if capacity <= 0:
        raise ValueError("capacity must be greater than zero")
    if occupancy < 0:
        raise ValueError("occupancy cannot be negative")
    if occupancy > capacity:
        return {
            "percentage": float(occupancy * 100 / capacity),
            "status": "overloaded",
            "warning": "occupancy exceeds capacity",
        }

    percentage = float(occupancy * 100 / capacity)
    if percentage < 40:
        status = "low"
    elif percentage <= 75:
        status = "normal"
    elif percentage <= 90:
        status = "high"
    else:
        status = "overloaded"

    return {"percentage": percentage, "status": status}