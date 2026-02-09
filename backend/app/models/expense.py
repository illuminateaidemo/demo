"""
Expense model for project-related cost tracking.
"""

import enum
from datetime import date, datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
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
    from app.models.project import Project
    from app.models.user import User


class ExpenseCategory(str, enum.Enum):
    """Categories for expense classification."""

    TRAVEL = "TRAVEL"
    ACCOMMODATION = "ACCOMMODATION"
    MEALS = "MEALS"
    EQUIPMENT = "EQUIPMENT"
    SOFTWARE = "SOFTWARE"
    OTHER = "OTHER"


class ExpenseStatus(str, enum.Enum):
    """Approval lifecycle of an expense claim."""

    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CLOSED = "CLOSED"


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id"), nullable=False, index=True
    )
    category: Mapped[str] = mapped_column(
        String(30), nullable=False, default=ExpenseCategory.OTHER.value
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    receipt_reference: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    date_incurred: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=ExpenseStatus.DRAFT.value
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
    policy_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
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
        back_populates="expenses",
        lazy="selectin",
    )
    project: Mapped["Project"] = relationship(
        "Project", back_populates="expenses", lazy="selectin"
    )
    approved_by: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[approved_by_id],
        back_populates="approved_expenses",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_expenses_status", "status"),
        Index("ix_expenses_category", "category"),
        Index("ix_expenses_date_incurred", "date_incurred"),
    )

    def __repr__(self) -> str:
        return (
            f"<Expense id={self.id} user_id={self.user_id} "
            f"amount={self.amount} status={self.status}>"
        )
