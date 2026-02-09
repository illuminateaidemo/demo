"""
User model for authentication and identity.
"""

import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Index, String, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.opportunity import Opportunity
    from app.models.project import Project, ProjectHealthLog
    from app.models.resource import Resource, ResourceAllocation
    from app.models.timesheet import Timesheet
    from app.models.expense import Expense
    from app.models.financial import WIPEntry, PostingPeriod
    from app.models.approval import ApprovalRequest


class UserRole(str, enum.Enum):
    """Roles available within the platform."""

    ADMIN = "ADMIN"
    DELIVERY_LEAD = "DELIVERY_LEAD"
    PROJECT_MANAGER = "PROJECT_MANAGER"
    RESOURCE_MANAGER = "RESOURCE_MANAGER"
    FINANCE = "FINANCE"
    SALES = "SALES"
    CONSULTANT = "CONSULTANT"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(
        String(320), unique=True, nullable=False, index=True
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(1024), nullable=False)
    role: Mapped[str] = mapped_column(
        String(50), nullable=False, default=UserRole.CONSULTANT.value
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    office: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    practice: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
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
    created_clients: Mapped[List["Client"]] = relationship(
        "Client", back_populates="created_by", lazy="selectin"
    )
    owned_opportunities: Mapped[List["Opportunity"]] = relationship(
        "Opportunity", back_populates="owner", lazy="selectin"
    )
    managed_projects: Mapped[List["Project"]] = relationship(
        "Project", back_populates="project_manager", lazy="selectin"
    )
    health_logs: Mapped[List["ProjectHealthLog"]] = relationship(
        "ProjectHealthLog", back_populates="logged_by", lazy="selectin"
    )
    resource_profile: Mapped[Optional["Resource"]] = relationship(
        "Resource", back_populates="user", uselist=False, lazy="selectin"
    )
    requested_allocations: Mapped[List["ResourceAllocation"]] = relationship(
        "ResourceAllocation",
        foreign_keys="ResourceAllocation.requested_by_id",
        back_populates="requested_by",
        lazy="selectin",
    )
    approved_allocations: Mapped[List["ResourceAllocation"]] = relationship(
        "ResourceAllocation",
        foreign_keys="ResourceAllocation.approved_by_id",
        back_populates="approved_by",
        lazy="selectin",
    )
    timesheets: Mapped[List["Timesheet"]] = relationship(
        "Timesheet",
        foreign_keys="Timesheet.user_id",
        back_populates="user",
        lazy="selectin",
    )
    approved_timesheets: Mapped[List["Timesheet"]] = relationship(
        "Timesheet",
        foreign_keys="Timesheet.approved_by_id",
        back_populates="approved_by",
        lazy="selectin",
    )
    expenses: Mapped[List["Expense"]] = relationship(
        "Expense",
        foreign_keys="Expense.user_id",
        back_populates="user",
        lazy="selectin",
    )
    approved_expenses: Mapped[List["Expense"]] = relationship(
        "Expense",
        foreign_keys="Expense.approved_by_id",
        back_populates="approved_by",
        lazy="selectin",
    )
    reviewed_wip_entries: Mapped[List["WIPEntry"]] = relationship(
        "WIPEntry", back_populates="reviewed_by", lazy="selectin"
    )
    opened_periods: Mapped[List["PostingPeriod"]] = relationship(
        "PostingPeriod",
        foreign_keys="PostingPeriod.opened_by_id",
        back_populates="opened_by",
        lazy="selectin",
    )
    closed_periods: Mapped[List["PostingPeriod"]] = relationship(
        "PostingPeriod",
        foreign_keys="PostingPeriod.closed_by_id",
        back_populates="closed_by",
        lazy="selectin",
    )
    requested_approvals: Mapped[List["ApprovalRequest"]] = relationship(
        "ApprovalRequest",
        foreign_keys="ApprovalRequest.requested_by_id",
        back_populates="requested_by",
        lazy="selectin",
    )
    assigned_approvals: Mapped[List["ApprovalRequest"]] = relationship(
        "ApprovalRequest",
        foreign_keys="ApprovalRequest.assigned_to_id",
        back_populates="assigned_to",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_users_role", "role"),
        Index("ix_users_office", "office"),
        Index("ix_users_practice", "practice"),
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} role={self.role}>"
