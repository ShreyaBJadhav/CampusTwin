from app.allocation import find_alternative_room
from app.errors import NotFoundError
from app.utilization import calculate_utilization


def run_what_if(
    rooms: list[dict],
    schedule: list[dict],
    *,
    unavailable_room_id: str | None = None,
    unavailable_building_id: str | None = None,
) -> dict:
    """Simulate reallocating classes affected by an unavailable room or building."""
    if (unavailable_room_id is None) == (unavailable_building_id is None):
        raise ValueError(
            "provide exactly one of unavailable_room_id or unavailable_building_id"
        )

    if unavailable_building_id is not None:
        unavailable_room_ids = [
            room["id"]
            for room in rooms
            if room.get("building_id") == unavailable_building_id
        ]
        if not unavailable_room_ids:
            raise NotFoundError(
                f"building ID {unavailable_building_id!r} was not found"
            )
    else:
        if not any(room["id"] == unavailable_room_id for room in rooms):
            raise NotFoundError(f"room ID {unavailable_room_id!r} was not found")
        unavailable_room_ids = [unavailable_room_id]

    unavailable_room_id_set = set(unavailable_room_ids)
    affected_classes = [
        entry for entry in schedule if entry["room_id"] in unavailable_room_id_set
    ]
    available_rooms = [
        room for room in rooms if room["id"] not in unavailable_room_id_set
    ]
    reallocated = []
    failed = []
    used_room_ids = set()
    overloaded_room_ids = set()
    for room in available_rooms:
        try:
            utilization = calculate_utilization(room)
        except (ValueError, TypeError):
            continue
        if utilization["status"] == "overloaded":
            overloaded_room_ids.add(room["id"])

    for entry in affected_classes:
        alternative = find_alternative_room(
            entry["room_id"],
            entry["student_count"],
            entry["type"],
            available_rooms,
            excluded_room_ids=used_room_ids | overloaded_room_ids,
        )
        if alternative is None:
            alternative = find_alternative_room(
                entry["room_id"],
                entry["student_count"],
                entry["type"],
                available_rooms,
                excluded_room_ids=used_room_ids,
            )
        if alternative is None:
            failed.append(
                {
                    "class_id": entry["class_id"],
                    "reason": "no suitable room",
                }
            )
        else:
            used_room_ids.add(alternative["id"])
            reallocated.append(
                {
                    "class_id": entry["class_id"],
                    "new_room_id": alternative["id"],
                }
            )

    return {
        "affected_count": len(affected_classes),
        "unavailable_room_ids": unavailable_room_ids,
        "reallocated": reallocated,
        "failed": failed,
    }