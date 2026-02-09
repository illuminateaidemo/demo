"""
Expense claim and line-item schemas.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date, datetime
from enum import Enum


class ExpenseCategory(str, Enum):
    TRAVEL = "TRAVEL"
    ACCOMMODATION = "ACCOMMODATION"
    MEALS = "MEALS"
    TRANSPORT = "TRANSPORT"
    EQUIPMENT = "EQUIPMENT"
    SOFTWARE = "SOFTWARE"
    TRAINING = "TRAINING"
    CLIENT_ENTERTAINMENT = "CLIENT_ENTERTAINMENT"
    OFFICE_SUPPLIES = "OFFICE_SUPPLIES"
    OTHER = "OTHER"


class ExpenseStatus(str, Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PAID = "PAID"


# ---------------------------------------------------------------------------
# Expense schemas
# ---------------------------------------------------------------------------

class ExpenseBase(BaseModel):
    resource_id: int
    project_id: Optional[int] = None
    phase_id: Optional[int] = None
    category: ExpenseCategory
    description: str = Field(..., min_length=1, max_length=500)
    amount: float = Field(..., gt=0, description="Expense amount, must be positive")
    currency: str = Field(default="GBP", max_length=3)
    date_incurred: date
    is_billable: bool = False
    receipt_url: Optional[str] = None
    vendor: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def validate_positive_amount(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Amount must be a positive number")
        return round(v, 2)


class ExpenseCreate(ExpenseBase):
    status: ExpenseStatus = ExpenseStatus.DRAFT


class ExpenseUpdate(BaseModel):
    project_id: Optional[int] = None
    phase_id: Optional[int] = None
    category: Optional[ExpenseCategory] = None
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    amount: Optional[float] = Field(None, gt=0)
    currency: Optional[str] = Field(None, max_length=3)
    date_incurred: Optional[date] = None
    is_billable: Optional[bool] = None
    receipt_url: Optional[str] = None
    vendor: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[ExpenseStatus] = None

    @field_validator("amount")
    @classmethod
    def validate_update_amount(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("Amount must be a positive number")
        if v is not None:
            return round(v, 2)
        return v


class ExpenseResponse(ExpenseBase):
    id: int
    status: ExpenseStatus
    resource_name: Optional[str] = None
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    approved_by_id: Optional[int] = None
    approved_by_name: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ExpenseListResponse(BaseModel):
    expenses: list[ExpenseResponse]
    total: int
    total_amount: float = 0.0


class ExpenseApproval(BaseModel):
    """Payload for approving or rejecting an expense."""
    expense_id: int
    approved: bool
    rejection_reason: Optional[str] = None

    @field_validator("rejection_reason")
    @classmethod
    def rejection_needs_reason(cls, v: Optional[str], info) -> Optional[str]:
        approved = info.data.get("approved")
        if approved is False and not v:
            raise ValueError("rejection_reason is required when rejecting an expense")
        return v
