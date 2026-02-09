"""
Project, ProjectPhase, and ProjectHealthLog models.
"""

import enum
from datetime import date, datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
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

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.expense import Expense
    from app.models.financial import BillingMilestone, WIPEntry
    from app.models.opportunity import Opportunity
    from app.models.resource import ResourceAllocation, ResourceDemand
    from app.models.timesheet import TimesheetEntry
    from app.models.user import User


class ProjectStatus(str, enum.Enum):
    """High-level project lifecycle status."""

    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    ON_HOLD = "ON_HOLD"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class CommercialModel(str, enum.Enum):
    """How the project is billed."""

    FIXED_PRICE = "FIXED_PRICE"
    TIME_AND_MATERIALS = "TIME_AND_MATERIALS"
    RETAINER = "RETAINER"
    MILESTONE = "MILESTONE"


class HealthStatus(str, enum.Enum):
    """RAG status for project health."""

    GREEN = "GREEN"
    AMBER = "AMBER"
    RED = "RED"


class PhaseStatus(str, enum.Enum):
    """Lifecycle status of a project phase."""

    PLANNED = "PLANNED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id"), nullable=False, index=True
    )
    opportunity_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("opportunities.id"), nullable=True, index=True
    )
    project_manager_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default=ProjectStatus.DRAFT.value
    )
    commercial_model: Mapped[Optional[str]] = mapped_column(
        String(30), nullable=True
    )
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    budget_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    budget_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    health_status: Mapped[str] = mapped_column(
        String(10), nullable=False, default=HealthStatus.GREEN.value
    )
    health_narrative: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    practice: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    office: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
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
    client: Mapped["Client"] = relationship(
        "Client", back_populates="projects", lazy="selectin"
    )
    opportunity: Mapped[Optional["Opportunity"]] = relationship(
        "Opportunity", back_populates="project", lazy="selectin"
    )
    project_manager: Mapped[Optional["User"]] = relationship(
        "User", back_populates="managed_projects", lazy="selectin"
    )
    phases: Mapped[List["ProjectPhase"]] = relationship(
        "ProjectPhase",
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ProjectPhase.sort_order",
    )
    health_logs: Mapped[List["ProjectHealthLog"]] = relationship(
        "ProjectHealthLog",
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ProjectHealthLog.logged_at.desc()",
    )
    allocations: Mapped[List["ResourceAllocation"]] = relationship(
        "ResourceAllocation", back_populates="project", lazy="selectin"
    )
    demands: Mapped[List["ResourceDemand"]] = relationship(
        "ResourceDemand", back_populates="project", lazy="selectin"
    )
    timesheet_entries: Mapped[List["TimesheetEntry"]] = relationship(
        "TimesheetEntry", back_populates="project", lazy="selectin"
    )
    expenses: Mapped[List["Expense"]] = relationship(
        "Expense", back_populates="project", lazy="selectin"
    )
    billing_milestones: Mapped[List["BillingMilestone"]] = relationship(
        "BillingMilestone", back_populates="project", lazy="selectin"
    )
    wip_entries: Mapped[List["WIPEntry"]] = relationship(
        "WIPEntry", back_populates="project", lazy="selectin"
    )

    __table_args__ = (
        Index("ix_projects_status", "status"),
        Index("ix_projects_health_status", "health_status"),
        Index("ix_projects_practice", "practice"),
        Index("ix_projects_office", "office"),
    )

    def __repr__(self) -> str:
        return f"<Project id={self.id} code={self.code!r} status={self.status}>"


class ProjectPhase(Base):
    __tablename__ = "project_phases"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    budget_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    budget_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default=PhaseStatus.PLANNED.value
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # --- Relationships ---
    project: Mapped["Project"] = relationship(
        "Project", back_populates="phases", lazy="selectin"
    )
    allocations: Mapped[List["ResourceAllocation"]] = relationship(
        "ResourceAllocation", back_populates="phase", lazy="selectin"
    )
    timesheet_entries: Mapped[List["TimesheetEntry"]] = relationship(
        "TimesheetEntry", back_populates="phase", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<ProjectPhase id={self.id} name={self.name!r}>"


class ProjectHealthLog(Base):
    __tablename__ = "project_health_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(10), nullable=False)
    narrative: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    logged_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    logged_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # --- Relationships ---
    project: Mapped["Project"] = relationship(
        "Project", back_populates="health_logs", lazy="selectin"
    )
    logged_by: Mapped[Optional["User"]] = relationship(
        "User", back_populates="health_logs", lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"<ProjectHealthLog id={self.id} project_id={self.project_id} "
            f"status={self.status}>"
        )
