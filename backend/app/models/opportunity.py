"""
Opportunity (sales pipeline) model.
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
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.project import Project
    from app.models.user import User


class OpportunityStatus(str, enum.Enum):
    """Sales pipeline stage."""

    IDENTIFIED = "IDENTIFIED"
    QUALIFYING = "QUALIFYING"
    PROPOSAL = "PROPOSAL"
    NEGOTIATION = "NEGOTIATION"
    WON = "WON"
    LOST = "LOST"


class Opportunity(Base):
    __tablename__ = "opportunities"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    probability: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    expected_start: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    expected_end: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default=OpportunityStatus.IDENTIFIED.value
    )
    owner_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), nullable=True, index=True
    )
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
    client: Mapped["Client"] = relationship(
        "Client", back_populates="opportunities", lazy="selectin"
    )
    owner: Mapped[Optional["User"]] = relationship(
        "User", back_populates="owned_opportunities", lazy="selectin"
    )
    project: Mapped[Optional["Project"]] = relationship(
        "Project", back_populates="opportunity", uselist=False, lazy="selectin"
    )

    __table_args__ = (
        Index("ix_opportunities_status", "status"),
        Index("ix_opportunities_practice", "practice"),
    )

    def __repr__(self) -> str:
        return (
            f"<Opportunity id={self.id} name={self.name!r} status={self.status}>"
        )
