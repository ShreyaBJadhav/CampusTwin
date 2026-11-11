from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class RoomOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    building_id: str
    type: str
    capacity: int
    occupancy: int
    last_updated: datetime

class BuildingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str

class ScheduleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    class_id: str
    room_id: str
    student_count: int
    type: str

class OccupancyUpdate(BaseModel):
    current_occupancy: int = Field(ge=0, examples=[18])
