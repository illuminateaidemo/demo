"""
Timesheet and TimesheetEntry schemas.

Aligned with existing ORM models.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date, datetime
from enum import Enum


class TimesheetStatus(str, Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    LOCKED = "LOCKED"


class ActivityType(str, Enum):
    DELIVERY = "DELIVERY"
    MANAGEMENT = "MANAGEMENT"
    TRAVEL = "TRAVEL"
    TRAINING = "TRAINING"
    INTERNAL = "INTERNAL"
    LEAVE = "LEAVE"


# ---------------------------------------------------------------------------
# TimesheetEntry schemas
# ---------------------------------------------------------------------------

class TimesheetEntryBase(BaseModel):
    project_id: int
    phase_id: Optional[int] = None
    activity_type: ActivityType = ActivityType.DELIVERY
    date: date
    hours: float = Field(..., ge=0, le=24, description="Hours worked (0-24)")
    notes: Optional[str] = None
    is_billable: bool = True


class TimesheetEntryCreate(TimesheetEntryBase):
    pass


class TimesheetEntryUpdate(BaseModel):
    project_id: Optional[int] = None
    phase_id: Optional[int] = None
    activity_type: Optional[ActivityType] = None
    date: Optional[date] = None
    hours: Optional[float] = Field(None, ge=0, le=24)
    notes: Optional[str] = None
    is_billable: Optional[bool] = None


class TimesheetEntryResponse(TimesheetEntryBase):
    id: int
    timesheet_id: int
    project_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Timesheet schemas
# ---------------------------------------------------------------------------

class TimesheetBase(BaseModel):
    week_starting: date

    @field_validator("week_starting")
    @classmethod
    def week_start_must_be_monday(cls, v: date) -> date:
        if v.weekday() != 0:
            raise ValueError("week_starting must be a Monday")
        return v


class TimesheetCreate(TimesheetBase):
    pass


class TimesheetUpdate(BaseModel):
    notes: Optional[str] = None


class TimesheetResponse(BaseModel):
    id: int
    user_id: int
    user_name: Optional[str] = None
    week_starting: date
    status: str
    total_hours: float = 0.0
    submitted_at: Optional[datetime] = None
    approved_by_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    notes: Optional[str] = None
    locked_at: Optional[datetime] = None
    entries: list[TimesheetEntryResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TimesheetListResponse(BaseModel):
    timesheets: list[TimesheetResponse]
    total: int


class RejectionRequest(BaseModel):
    notes: str = Field(..., min_length=1, description="Reason for rejection")
