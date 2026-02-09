"""
Expense schemas.

Aligned with existing Expense ORM model.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from enum import Enum


class ExpenseStatus(str, Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CLOSED = "CLOSED"


class ExpenseCategory(str, Enum):
    TRAVEL = "TRAVEL"
    ACCOMMODATION = "ACCOMMODATION"
    MEALS = "MEALS"
    EQUIPMENT = "EQUIPMENT"
    SOFTWARE = "SOFTWARE"
    OTHER = "OTHER"


class ExpenseBase(BaseModel):
    project_id: int
    category: ExpenseCategory = ExpenseCategory.OTHER
    description: str = Field(..., min_length=1)
    amount: float = Field(..., gt=0)
    currency: str = Field(default="USD", max_length=3)
    receipt_reference: Optional[str] = None
    date_incurred: date
    policy_notes: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    project_id: Optional[int] = None
    category: Optional[ExpenseCategory] = None
    description: Optional[str] = Field(None, min_length=1)
    amount: Optional[float] = Field(None, gt=0)
    currency: Optional[str] = Field(None, max_length=3)
    receipt_reference: Optional[str] = None
    date_incurred: Optional[date] = None
    policy_notes: Optional[str] = None


class ExpenseResponse(ExpenseBase):
    id: int
    user_id: int
    user_name: Optional[str] = None
    project_name: Optional[str] = None
    status: str
    submitted_at: Optional[datetime] = None
    approved_by_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ExpenseListResponse(BaseModel):
    expenses: list[ExpenseResponse]
    total: int


class ExpenseRejectionRequest(BaseModel):
    notes: str = Field(..., min_length=1, description="Reason for rejection")
