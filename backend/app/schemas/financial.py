"""
Financial schemas: billing milestones, WIP, and posting periods.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date, datetime
from enum import Enum


class BillingMilestoneStatus(str, Enum):
    PLANNED = "PLANNED"
    READY_TO_BILL = "READY_TO_BILL"
    INVOICED = "INVOICED"
    PAID = "PAID"
    CANCELLED = "CANCELLED"
    WRITTEN_OFF = "WRITTEN_OFF"


class WIPStatus(str, Enum):
    UNBILLED = "UNBILLED"
    BILLED = "BILLED"
    WRITTEN_OFF = "WRITTEN_OFF"
    REVERSED = "REVERSED"


class PeriodStatus(str, Enum):
    OPEN = "OPEN"
    CLOSING = "CLOSING"
    CLOSED = "CLOSED"


# ---------------------------------------------------------------------------
# Billing Milestone schemas
# ---------------------------------------------------------------------------

class BillingMilestoneBase(BaseModel):
    project_id: int
    phase_id: Optional[int] = None
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    amount: float = Field(..., gt=0, description="Milestone billing amount")
    currency: str = Field(default="GBP", max_length=3)
    planned_date: date
    due_date: Optional[date] = None
    status: BillingMilestoneStatus = BillingMilestoneStatus.PLANNED
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    payment_date: Optional[date] = None
    notes: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Milestone amount must be positive")
        return round(v, 2)


class BillingMilestoneCreate(BillingMilestoneBase):
    pass


class BillingMilestoneUpdate(BaseModel):
    phase_id: Optional[int] = None
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    currency: Optional[str] = Field(None, max_length=3)
    planned_date: Optional[date] = None
    due_date: Optional[date] = None
    status: Optional[BillingMilestoneStatus] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    payment_date: Optional[date] = None
    notes: Optional[str] = None


class BillingMilestoneResponse(BillingMilestoneBase):
    id: int
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class BillingMilestoneListResponse(BaseModel):
    milestones: list[BillingMilestoneResponse]
    total: int
    total_amount: float = 0.0
    total_invoiced: float = 0.0
    total_paid: float = 0.0


# ---------------------------------------------------------------------------
# WIP (Work In Progress) schemas
# ---------------------------------------------------------------------------

class WIPEntryBase(BaseModel):
    project_id: int
    phase_id: Optional[int] = None
    resource_id: Optional[int] = None
    period_start: date
    period_end: date
    hours: float = Field(default=0, ge=0)
    cost_amount: float = Field(default=0, ge=0)
    bill_amount: float = Field(default=0, ge=0)
    currency: str = Field(default="GBP", max_length=3)
    status: WIPStatus = WIPStatus.UNBILLED
    description: Optional[str] = None


class WIPEntryResponse(WIPEntryBase):
    id: int
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    resource_name: Optional[str] = None
    posting_period_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class WIPSummary(BaseModel):
    """Aggregated WIP summary across projects or periods."""
    total_hours: float = 0.0
    total_cost: float = 0.0
    total_bill_value: float = 0.0
    total_unbilled: float = 0.0
    total_billed: float = 0.0
    total_written_off: float = 0.0
    by_project: dict[str, float] = Field(
        default_factory=dict,
        description="Project code -> unbilled WIP value"
    )
    by_resource: dict[str, float] = Field(
        default_factory=dict,
        description="Resource name -> unbilled WIP value"
    )
    currency: str = "GBP"


class WIPEntryListResponse(BaseModel):
    entries: list[WIPEntryResponse]
    total: int
    summary: Optional[WIPSummary] = None


# ---------------------------------------------------------------------------
# Posting Period schemas
# ---------------------------------------------------------------------------

class PostingPeriodBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="e.g. '2025-01' or 'Jan 2025'")
    start_date: date
    end_date: date
    status: PeriodStatus = PeriodStatus.OPEN
    notes: Optional[str] = None

    @field_validator("end_date")
    @classmethod
    def period_end_after_start(cls, v: date, info) -> date:
        start = info.data.get("start_date")
        if start is not None and v < start:
            raise ValueError("Period end_date must be on or after start_date")
        return v


class PostingPeriodCreate(PostingPeriodBase):
    pass


class PostingPeriodUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[PeriodStatus] = None
    notes: Optional[str] = None


class PostingPeriodResponse(PostingPeriodBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    total_wip_value: Optional[float] = None
    total_billed: Optional[float] = None

    model_config = {"from_attributes": True}


class PostingPeriodListResponse(BaseModel):
    periods: list[PostingPeriodResponse]
    total: int


# ---------------------------------------------------------------------------
# Revenue Recognition schemas
# ---------------------------------------------------------------------------

class RevenueRecognitionEntry(BaseModel):
    project_id: int
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    period_name: str
    recognised_revenue: float = 0.0
    deferred_revenue: float = 0.0
    accrued_revenue: float = 0.0
    total_contract_value: float = 0.0
    pct_complete: float = Field(default=0.0, ge=0, le=100)
    currency: str = "GBP"


class RevenueRecognitionReport(BaseModel):
    period_name: str
    entries: list[RevenueRecognitionEntry] = []
    total_recognised: float = 0.0
    total_deferred: float = 0.0
    total_accrued: float = 0.0
