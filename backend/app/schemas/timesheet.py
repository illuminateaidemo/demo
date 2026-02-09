"""
Timesheet and timesheet entry schemas with validation.
"""

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional
from datetime import date, datetime, timedelta
from enum import Enum


class TimesheetStatus(str, Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ActivityType(str, Enum):
    BILLABLE = "BILLABLE"
    NON_BILLABLE = "NON_BILLABLE"
    INTERNAL = "INTERNAL"
    TRAINING = "TRAINING"
    LEAVE = "LEAVE"
    SICK = "SICK"
    PUBLIC_HOLIDAY = "PUBLIC_HOLIDAY"
    BENCH = "BENCH"


# ---------------------------------------------------------------------------
# Timesheet Entry schemas
# ---------------------------------------------------------------------------

class TimesheetEntryBase(BaseModel):
    project_id: Optional[int] = None
    phase_id: Optional[int] = None
    activity_type: ActivityType = ActivityType.BILLABLE
    entry_date: date
    hours: float = Field(..., ge=0, le=24, description="Hours worked, 0-24")
    description: Optional[str] = None
    is_billable: bool = True

    @field_validator("hours")
    @classmethod
    def validate_hours(cls, v: float) -> float:
        if v < 0 or v > 24:
            raise ValueError("Hours must be between 0 and 24")
        return round(v, 2)


class TimesheetEntryCreate(TimesheetEntryBase):
    timesheet_id: Optional[int] = None


class TimesheetEntryUpdate(BaseModel):
    project_id: Optional[int] = None
    phase_id: Optional[int] = None
    activity_type: Optional[ActivityType] = None
    entry_date: Optional[date] = None
    hours: Optional[float] = Field(None, ge=0, le=24)
    description: Optional[str] = None
    is_billable: Optional[bool] = None

    @field_validator("hours")
    @classmethod
    def validate_update_hours(cls, v: Optional[float]) -> Optional[float]:
        if v is not None:
            if v < 0 or v > 24:
                raise ValueError("Hours must be between 0 and 24")
            return round(v, 2)
        return v


class TimesheetEntryResponse(TimesheetEntryBase):
    id: int
    timesheet_id: int
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Timesheet schemas
# ---------------------------------------------------------------------------

class TimesheetBase(BaseModel):
    resource_id: int
    week_starting: date
    notes: Optional[str] = None

    @field_validator("week_starting")
    @classmethod
    def validate_week_starting(cls, v: date) -> date:
        if v.weekday() != 0:
            raise ValueError("week_starting must be a Monday")
        return v


class TimesheetCreate(TimesheetBase):
    entries: list[TimesheetEntryCreate] = Field(default_factory=list)
    status: TimesheetStatus = TimesheetStatus.DRAFT

    @model_validator(mode="after")
    def validate_entries_within_week(self) -> "TimesheetCreate":
        week_end = self.week_starting + timedelta(days=6)
        for entry in self.entries:
            if entry.entry_date < self.week_starting or entry.entry_date > week_end:
                raise ValueError(
                    f"Entry date {entry.entry_date} is outside the timesheet week "
                    f"({self.week_starting} to {week_end})"
                )
        return self


class TimesheetUpdate(BaseModel):
    notes: Optional[str] = None
    status: Optional[TimesheetStatus] = None


class TimesheetResponse(TimesheetBase):
    id: int
    status: TimesheetStatus
    total_hours: float = 0.0
    billable_hours: float = 0.0
    non_billable_hours: float = 0.0
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    approved_by_id: Optional[int] = None
    rejection_reason: Optional[str] = None
    resource_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TimesheetWeekResponse(TimesheetResponse):
    """Aggregated weekly view including all daily entries."""
    entries: list[TimesheetEntryResponse] = []
    hours_by_day: dict[str, float] = Field(
        default_factory=dict,
        description="ISO date string -> total hours for that day"
    )
    hours_by_project: dict[str, float] = Field(
        default_factory=dict,
        description="Project name -> total hours for the week"
    )

    model_config = {"from_attributes": True}


class TimesheetListResponse(BaseModel):
    timesheets: list[TimesheetResponse]
    total: int


class TimesheetSubmit(BaseModel):
    """Payload for submitting a timesheet for approval."""
    timesheet_id: int
    notes: Optional[str] = None


class TimesheetApproval(BaseModel):
    """Payload for approving or rejecting a timesheet."""
    timesheet_id: int
    approved: bool
    rejection_reason: Optional[str] = None

    @model_validator(mode="after")
    def rejection_requires_reason(self) -> "TimesheetApproval":
        if not self.approved and not self.rejection_reason:
            raise ValueError("rejection_reason is required when rejecting a timesheet")
        return self
