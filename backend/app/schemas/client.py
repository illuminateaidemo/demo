"""
Client and client contact schemas.

Aligned with existing Client/ClientContact ORM models.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class ClientStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    PROSPECT = "PROSPECT"


# ---------------------------------------------------------------------------
# Client Contact schemas
# ---------------------------------------------------------------------------

class ClientContactBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=150)
    last_name: str = Field(..., min_length=1, max_length=150)
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_primary: bool = False


class ClientContactCreate(ClientContactBase):
    pass


class ClientContactUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=150)
    last_name: Optional[str] = Field(None, min_length=1, max_length=150)
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_primary: Optional[bool] = None


class ClientContactResponse(ClientContactBase):
    id: int
    client_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Client schemas
# ---------------------------------------------------------------------------

class ClientBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    industry: Optional[str] = None
    status: ClientStatus = ClientStatus.PROSPECT
    website: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    industry: Optional[str] = None
    status: Optional[ClientStatus] = None
    website: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class ClientResponse(ClientBase):
    id: int
    created_by_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    contacts: list[ClientContactResponse] = []

    model_config = {"from_attributes": True}


class ClientListResponse(BaseModel):
    clients: list[ClientResponse]
    total: int
