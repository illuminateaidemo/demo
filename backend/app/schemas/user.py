"""
User schemas for authentication, registration, and profile management.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    DELIVERY_LEAD = "DELIVERY_LEAD"
    PROJECT_MANAGER = "PROJECT_MANAGER"
    RESOURCE_MANAGER = "RESOURCE_MANAGER"
    FINANCE = "FINANCE"
    SALES = "SALES"
    CONSULTANT = "CONSULTANT"


class UserBase(BaseModel):
    email: str
    full_name: str
    role: UserRole
    office: Optional[str] = None
    practice: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    office: Optional[str] = None
    practice: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    users: list[UserResponse]
    total: int


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: int
    role: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)
