"""
ApprovalRequest ORM model.
"""

import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class ApprovalRequestType(str, enum.Enum):
    """Types of approval requests."""

    TIMESHEET = "TIMESHEET"
    EXPENSE = "EXPENSE"
    RESOURCE_ALLOCATION = "RESOURCE_ALLOCATION"
    PROJECT_CHANGE = "PROJECT_CHANGE"
    BUDGET_CHANGE = "BUDGET_CHANGE"


class ApprovalStatus(str, enum.Enum):
    """Lifecycle of an approval request."""

    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class ApprovalRequest(Base):
    __tablename__ = "approval_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    request_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    requested_by_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    assigned_to_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=ApprovalStatus.PENDING.value
    )
    decision_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    decided_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationships
    requested_by: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[requested_by_id],
        back_populates="requested_approvals",
        lazy="selectin",
    )
    assigned_to: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[assigned_to_id],
        back_populates="assigned_approvals",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<ApprovalRequest(id={self.id}, type={self.request_type!r}, "
            f"status={self.status!r})>"
        )
