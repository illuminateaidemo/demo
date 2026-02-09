"""
Resource, ResourceAllocation, and ResourceDemand models.
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
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.project import Project, ProjectPhase
    from app.models.user import User


class AllocationStatus(str, enum.Enum):
    """Lifecycle of a resource allocation."""

    REQUESTED = "REQUESTED"
    TENTATIVE = "TENTATIVE"
    CONFIRMED = "CONFIRMED"
    RELEASED = "RELEASED"


class DemandStatus(str, enum.Enum):
    """Fulfilment status of a resource demand."""

    OPEN = "OPEN"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    FILLED = "FILLED"
    CANCELLED = "CANCELLED"


class Resource(Base):
    """Extended profile for users who are billable/allocatable resources."""

    __tablename__ = "resources"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), unique=True, nullable=False, index=True
    )
    job_title: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    grade: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    cost_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    bill_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    capacity_hours_per_week: Mapped[float] = mapped_column(
        Float, nullable=False, default=40.0
    )
    skills: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # --- Relationships ---
    user: Mapped["User"] = relationship(
        "User", back_populates="resource_profile", lazy="selectin"
    )
    allocations: Mapped[List["ResourceAllocation"]] = relationship(
        "ResourceAllocation", back_populates="resource", lazy="selectin"
    )

    __table_args__ = (
        Index("ix_resources_grade", "grade"),
        Index("ix_resources_location", "location"),
        Index("ix_resources_is_available", "is_available"),
    )

    def __repr__(self) -> str:
        return f"<Resource id={self.id} user_id={self.user_id} grade={self.grade!r}>"


class ResourceAllocation(Base):
    __tablename__ = "resource_allocations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    resource_id: Mapped[int] = mapped_column(
        ForeignKey("resources.id"), nullable=False, index=True
    )
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id"), nullable=False, index=True
    )
    phase_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("project_phases.id"), nullable=True, index=True
    )
    role_on_project: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    hours_per_week: Mapped[float] = mapped_column(Float, nullable=False, default=40.0)
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default=AllocationStatus.REQUESTED.value
    )
    requested_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    approved_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
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
    resource: Mapped["Resource"] = relationship(
        "Resource", back_populates="allocations", lazy="selectin"
    )
    project: Mapped["Project"] = relationship(
        "Project", back_populates="allocations", lazy="selectin"
    )
    phase: Mapped[Optional["ProjectPhase"]] = relationship(
        "ProjectPhase", back_populates="allocations", lazy="selectin"
    )
    requested_by: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[requested_by_id],
        back_populates="requested_allocations",
        lazy="selectin",
    )
    approved_by: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[approved_by_id],
        back_populates="approved_allocations",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_resource_allocations_status", "status"),
        Index(
            "ix_resource_allocations_dates",
            "start_date",
            "end_date",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<ResourceAllocation id={self.id} resource_id={self.resource_id} "
            f"project_id={self.project_id} status={self.status}>"
        )


class ResourceDemand(Base):
    __tablename__ = "resource_demands"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id"), nullable=False, index=True
    )
    role_required: Mapped[str] = mapped_column(String(200), nullable=False)
    grade_required: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    skills_required: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    hours_per_week: Mapped[float] = mapped_column(Float, nullable=False, default=40.0)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default=DemandStatus.OPEN.value
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # --- Relationships ---
    project: Mapped["Project"] = relationship(
        "Project", back_populates="demands", lazy="selectin"
    )

    __table_args__ = (
        Index("ix_resource_demands_status", "status"),
        Index("ix_resource_demands_grade_required", "grade_required"),
    )

    def __repr__(self) -> str:
        return (
            f"<ResourceDemand id={self.id} project_id={self.project_id} "
            f"role={self.role_required!r} status={self.status}>"
        )
