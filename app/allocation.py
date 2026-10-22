def find_alternative_room(
    unavailable_room_id: str,
    required_capacity: int,
    room_type: str,
    rooms: list[dict],
    excluded_room_ids: set[str] | None = None,
) -> dict | None:
    """Find the smallest room of the requested type with enough capacity."""
    excluded_room_ids = excluded_room_ids or set()
    candidates = (
        room
        for room in rooms
        if room.get("type") == room_type
        and room["capacity"] >= required_capacity
        and room["id"] != unavailable_room_id
        and room["id"] not in excluded_room_ids
    )
    return min(candidates, key=lambda room: room["capacity"], default=None)
