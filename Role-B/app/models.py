from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Building(Base):
    __tablename__ = "buildings"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    rooms: Mapped[list["Room"]] = relationship(back_populates="building")

class Room(Base):
    __tablename__ = "rooms"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    building_id: Mapped[str] = mapped_column(ForeignKey("buildings.id", ondelete="RESTRICT"), nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    occupancy: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_updated: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)
    building: Mapped["Building"] = relationship(back_populates="rooms")
    schedule_entries: Mapped[list["ClassSchedule"]] = relationship(back_populates="room")
    __table_args__ = (Index("ix_rooms_building_id", "building_id"),)

class ClassSchedule(Base):
    __tablename__ = "class_schedules"
    class_id: Mapped[str] = mapped_column(String, primary_key=True)
    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.id", ondelete="RESTRICT"), nullable=False)
    student_count: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    room: Mapped["Room"] = relationship(back_populates="schedule_entries")
    __table_args__ = (Index("ix_class_schedules_room_id", "room_id"),)
