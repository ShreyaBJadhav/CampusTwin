from app.logic.allocation import find_alternative_room
from app.logic.errors import NotFoundError
from app.logic.utilization import calculate_utilization


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
    reallocation_results = {}
    used_room_ids = set()
    students_reallocated = 0
    overloaded_room_ids = set()
    for room in available_rooms:
        try:
            utilization = calculate_utilization(room)
        except (ValueError, TypeError):
            continue
        if utilization["status"] == "overloaded":
            overloaded_room_ids.add(room["id"])

    processing_order = sorted(
        enumerate(affected_classes),
        key=lambda item: -item[1]["student_count"],
    )
    for original_index, entry in processing_order:
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
            if find_alternative_room(
                entry["room_id"],
                entry["student_count"],
                entry["type"],
                available_rooms,
            ) is None:
                detail = "no room of this type"
            else:
                detail = "all fitting rooms taken"
            reallocation_results[original_index] = (
                "failed",
                {
                    "class_id": entry["class_id"],
                    "reason": "no suitable room",
                    "detail": detail,
                },
            )
        else:
            used_room_ids.add(alternative["id"])
            students_reallocated += entry["student_count"]
            reallocation_results[original_index] = (
                "reallocated",
                {
                    "class_id": entry["class_id"],
                    "new_room_id": alternative["id"],
                },
            )

    reallocated = [
        reallocation_results[index][1]
        for index in range(len(affected_classes))
        if reallocation_results[index][0] == "reallocated"
    ]
    failed = [
        reallocation_results[index][1]
        for index in range(len(affected_classes))
        if reallocation_results[index][0] == "failed"
    ]
    students_affected = sum(entry["student_count"] for entry in affected_classes)
    students_unplaced = students_affected - students_reallocated

    return {
        "affected_count": len(affected_classes),
        "unavailable_room_ids": unavailable_room_ids,
        "reallocated": reallocated,
        "failed": failed,
        "impact": {
            "students_affected": students_affected,
            "students_reallocated": students_reallocated,
            "students_unplaced": students_unplaced,
            "reallocation_rate": (
                students_reallocated / students_affected
                if students_affected
                else 0.0
            ),
        },
    }