"""
Financial models: BillingMilestone, WIPEntry, and PostingPeriod.
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
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.user import User


class MilestoneStatus(str, enum.Enum):
    """Billing milestone lifecycle."""

    PENDING = "PENDING"
    READY = "READY"
    INVOICED = "INVOICED"
    PAID = "PAID"


class WIPStatus(str, enum.Enum):
    """Work-in-progress entry lifecycle."""

    OPEN = "OPEN"
    REVIEWED = "REVIEWED"
    POSTED = "POSTED"
    CLOSED = "CLOSED"


class PeriodStatus(str, enum.Enum):
    """Accounting period status."""

    OPEN = "OPEN"
    CLOSING = "CLOSING"
    CLOSED = "CLOSED"


class BillingMilestone(Base):
    __tablename__ = "billing_milestones"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=MilestoneStatus.PENDING.value
    )
    invoice_reference: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
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
    project: Mapped["Project"] = relationship(
        "Project", back_populates="billing_milestones", lazy="selectin"
    )

    __table_args__ = (
        Index("ix_billing_milestones_status", "status"),
        Index("ix_billing_milestones_due_date", "due_date"),
    )

    def __repr__(self) -> str:
        return (
            f"<BillingMilestone id={self.id} name={self.name!r} "
            f"amount={self.amount} status={self.status}>"
        )


class WIPEntry(Base):
    __tablename__ = "wip_entries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id"), nullable=False, index=True
    )
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    period_month: Mapped[int] = mapped_column(Integer, nullable=False)
    hours_logged: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    cost_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    bill_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    wip_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=WIPStatus.OPEN.value
    )
    reviewed_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    posted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # --- Relationships ---
    project: Mapped["Project"] = relationship(
        "Project", back_populates="wip_entries", lazy="selectin"
    )
    reviewed_by: Mapped[Optional["User"]] = relationship(
        "User", back_populates="reviewed_wip_entries", lazy="selectin"
    )

    __table_args__ = (
        Index("ix_wip_entries_status", "status"),
        Index("ix_wip_entries_period", "period_year", "period_month"),
        UniqueConstraint(
            "project_id",
            "period_year",
            "period_month",
            name="uq_wip_entries_project_period",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<WIPEntry id={self.id} project_id={self.project_id} "
            f"period={self.period_year}-{self.period_month:02d} "
            f"status={self.status}>"
        )


class PostingPeriod(Base):
    __tablename__ = "posting_periods"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=PeriodStatus.OPEN.value
    )
    opened_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    closed_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    opened_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    closed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # --- Relationships ---
    opened_by: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[opened_by_id],
        back_populates="opened_periods",
        lazy="selectin",
    )
    closed_by: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[closed_by_id],
        back_populates="closed_periods",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_posting_periods_status", "status"),
        UniqueConstraint("year", "month", name="uq_posting_periods_year_month"),
    )

    def __repr__(self) -> str:
        return (
            f"<PostingPeriod id={self.id} "
            f"period={self.year}-{self.month:02d} status={self.status}>"
        )
