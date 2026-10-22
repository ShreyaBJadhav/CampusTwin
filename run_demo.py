import json
from pathlib import Path
from pprint import pprint

from app.simulate import run_what_if


def main() -> None:
    data_dir = Path(__file__).parent / "data"
    with (data_dir / "mock_rooms.json").open(encoding="utf-8") as rooms_file:
        rooms = json.load(rooms_file)
    with (data_dir / "mock_schedule.json").open(encoding="utf-8") as schedule_file:
        schedule = json.load(schedule_file)

    unavailable_room_id = "classroom-101"
    result = run_what_if(
        rooms,
        schedule,
        unavailable_room_id=unavailable_room_id,
    )

    print(f"What-if simulation: {unavailable_room_id} unavailable")
    print(f"Affected classes: {result['affected_count']}")
    print("Reallocated rooms:")
    pprint(result["reallocated"], sort_dicts=False)
    print("Failures:")
    pprint(result["failed"], sort_dicts=False)


if __name__ == "__main__":
    main()
