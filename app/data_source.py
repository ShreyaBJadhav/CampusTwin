import json
from pathlib import Path


_DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def get_rooms() -> list[dict]:
    """Load room records from the current JSON data source."""
    with (_DATA_DIR / "mock_rooms.json").open(encoding="utf-8") as rooms_file:
        return json.load(rooms_file)


def get_schedule() -> list[dict]:
    """Load schedule records from the current JSON data source."""
    with (_DATA_DIR / "mock_schedule.json").open(
        encoding="utf-8"
    ) as schedule_file:
        return json.load(schedule_file)
