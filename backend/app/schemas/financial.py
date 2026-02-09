"""
Financial schemas: WIP, Billing Milestones, Posting Periods.

Aligned with existing ORM models.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from enum import Enum


class WIPStatus(str, Enum):
    OPEN = "OPEN"
    REVIEWED = "REVIEWED"
    POSTED = "POSTED"
    CLOSED = "CLOSED"


class MilestoneStatus(str, Enum):
    PENDING = "PENDING"
    READY = "READY"
    INVOICED = "INVOICED"
    PAID = "PAID"


class PeriodStatus(str, Enum):
    OPEN = "OPEN"
    CLOSING = "CLOSING"
    CLOSED = "CLOSED"


# ---------------------------------------------------------------------------
# WIP Entry schemas
# ---------------------------------------------------------------------------

class WIPEntryResponse(BaseModel):
    id: int
    project_id: int
    project_name: Optional[str] = None
    period_year: int
    period_month: int
    hours_logged: float
    cost_amount: float
    bill_amount: float
    wip_amount: float
    status: str
    reviewed_by_id: Optional[int] = None
    posted_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class WIPEntryListResponse(BaseModel):
    entries: list[WIPEntryResponse]
    total: int


class WIPReviewRequest(BaseModel):
    notes: Optional[str] = None


class WIPGenerateRequest(BaseModel):
    year: int
    month: int
    project_ids: Optional[list[int]] = None


class WIPSummaryEntry(BaseModel):
    project_id: int
    project_name: str
    total_hours: float
    total_cost: float
    total_revenue: float
    total_wip: float
    margin: float


class WIPSummaryResponse(BaseModel):
    entries: list[WIPSummaryEntry]
    grand_total_hours: float
    grand_total_cost: float
    grand_total_revenue: float
    grand_total_wip: float
    grand_total_margin: float


# ---------------------------------------------------------------------------
# Billing Milestone schemas
# ---------------------------------------------------------------------------

class BillingMilestoneBase(BaseModel):
    project_id: int
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    amount: float = Field(..., gt=0)
    currency: str = Field(default="USD", max_length=3)
    due_date: Optional[date] = None


class BillingMilestoneCreate(BillingMilestoneBase):
    pass


class BillingMilestoneUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    currency: Optional[str] = Field(None, max_length=3)
    due_date: Optional[date] = None


class BillingMilestoneResponse(BillingMilestoneBase):
    id: int
    status: str
    invoice_reference: Optional[str] = None
    project_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BillingMilestoneListResponse(BaseModel):
    milestones: list[BillingMilestoneResponse]
    total: int


class InvoicedRequest(BaseModel):
    invoice_reference: str = Field(..., min_length=1)


# ---------------------------------------------------------------------------
# Posting Period schemas
# ---------------------------------------------------------------------------

class PostingPeriodBase(BaseModel):
    year: int
    month: int = Field(..., ge=1, le=12)


class PostingPeriodCreate(PostingPeriodBase):
    pass


class PostingPeriodResponse(PostingPeriodBase):
    id: int
    status: str
    opened_by_id: Optional[int] = None
    opened_at: Optional[datetime] = None
    closed_by_id: Optional[int] = None
    closed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PostingPeriodListResponse(BaseModel):
    periods: list[PostingPeriodResponse]
    total: int


# ---------------------------------------------------------------------------
# Export schema
# ---------------------------------------------------------------------------

class FinancialExportResponse(BaseModel):
    export_date: datetime
    wip_entries: list[WIPEntryResponse]
    milestones: list[BillingMilestoneResponse]
    periods: list[PostingPeriodResponse]
