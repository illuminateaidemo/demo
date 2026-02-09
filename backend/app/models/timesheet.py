"""
Timesheet and TimesheetEntry models.
"""

import enum
from datetime import date, datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.project import Project, ProjectPhase
    from app.models.user import User


class TimesheetStatus(str, enum.Enum):
    """Approval lifecycle of a weekly timesheet."""

    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    LOCKED = "LOCKED"


class ActivityType(str, enum.Enum):
    """Category of work logged against a timesheet entry."""

    DELIVERY = "DELIVERY"
    MANAGEMENT = "MANAGEMENT"
    TRAVEL = "TRAVEL"
    TRAINING = "TRAINING"
    INTERNAL = "INTERNAL"
    LEAVE = "LEAVE"


class Timesheet(Base):
    __tablename__ = "timesheets"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )
    week_starting: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=TimesheetStatus.DRAFT.value
    )
    submitted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    approved_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    locked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # --- Relationships ---
    user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[user_id],
        back_populates="timesheets",
        lazy="selectin",
    )
    approved_by: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[approved_by_id],
        back_populates="approved_timesheets",
        lazy="selectin",
    )
    entries: Mapped[List["TimesheetEntry"]] = relationship(
        "TimesheetEntry",
        back_populates="timesheet",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_timesheets_status", "status"),
        Index("ix_timesheets_week_starting", "week_starting"),
        Index("ix_timesheets_user_week", "user_id", "week_starting", unique=True),
    )

    def __repr__(self) -> str:
        return (
            f"<Timesheet id={self.id} user_id={self.user_id} "
            f"week={self.week_starting} status={self.status}>"
        )


class TimesheetEntry(Base):
    __tablename__ = "timesheet_entries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    timesheet_id: Mapped[int] = mapped_column(
        ForeignKey("timesheets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id"), nullable=False, index=True
    )
    phase_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("project_phases.id"), nullable=True
    )
    activity_type: Mapped[str] = mapped_column(
        String(30), nullable=False, default=ActivityType.DELIVERY.value
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    hours: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_billable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # --- Relationships ---
    timesheet: Mapped["Timesheet"] = relationship(
        "Timesheet", back_populates="entries", lazy="selectin"
    )
    project: Mapped["Project"] = relationship(
        "Project", back_populates="timesheet_entries", lazy="selectin"
    )
    phase: Mapped[Optional["ProjectPhase"]] = relationship(
        "ProjectPhase", back_populates="timesheet_entries", lazy="selectin"
    )

    __table_args__ = (
        Index("ix_timesheet_entries_date", "date"),
        Index("ix_timesheet_entries_activity_type", "activity_type"),
    )

    def __repr__(self) -> str:
        return (
            f"<TimesheetEntry id={self.id} timesheet_id={self.timesheet_id} "
            f"project_id={self.project_id} hours={self.hours}>"
        )
