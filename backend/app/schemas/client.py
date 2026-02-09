"""
Client and client contact schemas.
"""

from pydantic import BaseModel, EmailStr, Field
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
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    is_primary: bool = False
    notes: Optional[str] = None


class ClientContactCreate(ClientContactBase):
    client_id: int


class ClientContactUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    is_primary: Optional[bool] = None
    notes: Optional[str] = None


class ClientContactResponse(ClientContactBase):
    id: int
    client_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Client schemas
# ---------------------------------------------------------------------------

class ClientBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    legal_entity_name: Optional[str] = None
    industry: Optional[str] = None
    sector: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    status: ClientStatus = ClientStatus.ACTIVE
    account_manager_id: Optional[int] = None
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    legal_entity_name: Optional[str] = None
    industry: Optional[str] = None
    sector: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    status: Optional[ClientStatus] = None
    account_manager_id: Optional[int] = None
    notes: Optional[str] = None


class ClientResponse(ClientBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    contacts: list[ClientContactResponse] = []

    model_config = {"from_attributes": True}


class ClientListResponse(BaseModel):
    clients: list[ClientResponse]
    total: int
