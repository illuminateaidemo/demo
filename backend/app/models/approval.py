"""
ApprovalRequest model for unified approval workflows.
"""

import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    DateTime,
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
    from app.models.user import User


class ApprovalRequestType(str, enum.Enum):
    """Type of entity requiring approval."""

    TIMESHEET = "TIMESHEET"
    EXPENSE = "EXPENSE"
    RESOURCE_ALLOCATION = "RESOURCE_ALLOCATION"
    PROJECT_CHANGE = "PROJECT_CHANGE"
    BUDGET_CHANGE = "BUDGET_CHANGE"


class ApprovalStatus(str, enum.Enum):
    """Approval decision status."""

    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class ApprovalRequest(Base):
    __tablename__ = "approval_requests"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    request_type: Mapped[str] = mapped_column(String(30), nullable=False)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    requested_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )
    assigned_to_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
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

    # --- Relationships ---
    requested_by: Mapped["User"] = relationship(
        "User",
        foreign_keys=[requested_by_id],
        back_populates="requested_approvals",
        lazy="selectin",
    )
    assigned_to: Mapped["User"] = relationship(
        "User",
        foreign_keys=[assigned_to_id],
        back_populates="assigned_approvals",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_approval_requests_status", "status"),
        Index("ix_approval_requests_request_type", "request_type"),
        Index(
            "ix_approval_requests_entity",
            "entity_type",
            "entity_id",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<ApprovalRequest id={self.id} type={self.request_type} "
            f"entity={self.entity_type}:{self.entity_id} status={self.status}>"
        )
