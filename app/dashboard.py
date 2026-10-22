from app.utilization import calculate_utilization


def get_dashboard_summary(rooms: list[dict]) -> dict:
    """Summarize room utilization, retaining rooms with invalid metrics."""
    status_counts = {
        "low": 0,
        "normal": 0,
        "high": 0,
        "overloaded": 0,
    }
    overloaded_rooms = []
    skipped_rooms = []

    for room in rooms:
        try:
            utilization = calculate_utilization(room)
        except (TypeError, ValueError) as error:
            skipped_rooms.append(
                {
                    "id": (
                        room.get("id")
                        if isinstance(room, dict) and isinstance(room.get("id"), str)
                        else None
                    ),
                    "reason": str(error),
                }
            )
            continue

        status_counts[utilization["status"]] += 1
        if utilization["status"] == "overloaded":
            overloaded_rooms.append({**room, **utilization})

    total_buildings = len(
        {
            room["building_id"]
            for room in rooms
            if isinstance(room, dict)
            and isinstance(room.get("building_id"), str)
        }
    )

    return {
        "total_rooms": len(rooms),
        "total_buildings": total_buildings,
        "status_counts": status_counts,
        "overloaded_rooms": overloaded_rooms,
        "skipped_rooms": skipped_rooms,
    }
