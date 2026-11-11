import json
from pathlib import Path

from app.logic.simulate import run_what_if


def print_scenario(
    title: str,
    rooms: list[dict],
    schedule: list[dict],
    **outage: str,
) -> None:
    result = run_what_if(rooms, schedule, **outage)
    affected_ids = set(result["unavailable_room_ids"])
    affected_classes = [
        entry for entry in schedule if entry["room_id"] in affected_ids
    ]
    placements = {
        item["class_id"]: item["new_room_id"] for item in result["reallocated"]
    }
    failures = {item["class_id"] for item in result["failed"]}

    print(f"\n{title}")
    if "unavailable_building_id" in outage:
        outage_target = (
            f"building {outage['unavailable_building_id']}: "
            f"{', '.join(result['unavailable_room_ids'])}"
        )
    else:
        outage_target = f"room {outage['unavailable_room_id']}"
    print(f"Outage: {outage_target}")
    print(f"{'Class':<12} {'Students':>8} {'Old room':<18} New room")
    print("-" * 62)
    for entry in affected_classes:
        if entry["class_id"] in placements:
            new_room = placements[entry["class_id"]]
        elif entry["class_id"] in failures:
            new_room = "FAILED"
        else:
            new_room = "NOT AFFECTED"
        print(
            f"{entry['class_id']:<12} {entry['student_count']:>8} "
            f"{entry['room_id']:<18} {new_room}"
        )

    impact = result["impact"]
    print(
        f"students reallocated: {impact['students_reallocated']}/"
        f"{impact['students_affected']} "
        f"({impact['reallocation_rate']:.1%})"
    )


def main() -> None:
    data_dir = Path(__file__).parent / "data"
    with (data_dir / "mock_rooms.json").open(encoding="utf-8") as rooms_file:
        rooms = json.load(rooms_file)
    with (data_dir / "mock_schedule.json").open(encoding="utf-8") as schedule_file:
        schedule = json.load(schedule_file)

    print_scenario(
        "Scenario 1: Single-room outage",
        rooms,
        schedule,
        unavailable_room_id="classroom-101",
    )
    print_scenario(
        "Scenario 2: Building outage",
        rooms,
        schedule,
        unavailable_building_id="academic-east",
    )
    classroom_101_only = [
        room for room in rooms if room["id"] == "classroom-101"
    ]
    print_scenario(
        "Scenario 3 (custom data: no spare classrooms)",
        classroom_101_only,
        schedule,
        unavailable_room_id="classroom-101",
    )
    print_scenario(
        "Scenario 4: Lab outage",
        rooms,
        schedule,
        unavailable_room_id="lab-203",
    )


if __name__ == "__main__":
    main()
