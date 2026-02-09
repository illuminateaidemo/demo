"""
Client and ClientContact models.
"""

import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.opportunity import Opportunity
    from app.models.project import Project


class ClientStatus(str, enum.Enum):
    """Lifecycle status of a client."""

    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    PROSPECT = "PROSPECT"


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    industry: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=ClientStatus.PROSPECT.value
    )
    website: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
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
    created_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )

    # --- Relationships ---
    created_by: Mapped[Optional["User"]] = relationship(
        "User", back_populates="created_clients", lazy="selectin"
    )
    contacts: Mapped[List["ClientContact"]] = relationship(
        "ClientContact",
        back_populates="client",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    opportunities: Mapped[List["Opportunity"]] = relationship(
        "Opportunity", back_populates="client", lazy="selectin"
    )
    projects: Mapped[List["Project"]] = relationship(
        "Project", back_populates="client", lazy="selectin"
    )

    __table_args__ = (
        Index("ix_clients_status", "status"),
        Index("ix_clients_industry", "industry"),
    )

    def __repr__(self) -> str:
        return f"<Client id={self.id} name={self.name!r} status={self.status}>"


class ClientContact(Base):
    __tablename__ = "client_contacts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    first_name: Mapped[str] = mapped_column(String(150), nullable=False)
    last_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(320), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    role: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # --- Relationships ---
    client: Mapped["Client"] = relationship(
        "Client", back_populates="contacts", lazy="selectin"
    )

    __table_args__ = (Index("ix_client_contacts_email", "email"),)

    def __repr__(self) -> str:
        return (
            f"<ClientContact id={self.id} "
            f"name={self.first_name!r} {self.last_name!r}>"
        )
