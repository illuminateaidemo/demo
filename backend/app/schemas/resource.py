"""
Resource, resource allocation, and resource demand schemas.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date, datetime
from enum import Enum


class ResourceAllocationStatus(str, Enum):
    TENTATIVE = "TENTATIVE"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"


class DemandStatus(str, Enum):
    OPEN = "OPEN"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    FILLED = "FILLED"
    CANCELLED = "CANCELLED"


class DemandPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


# ---------------------------------------------------------------------------
# Resource schemas
# ---------------------------------------------------------------------------

class ResourceBase(BaseModel):
    user_id: Optional[int] = None
    full_name: str = Field(..., min_length=1, max_length=255)
    email: Optional[str] = None
    job_title: Optional[str] = None
    grade: Optional[str] = None
    office: Optional[str] = None
    practice: Optional[str] = None
    skills: list[str] = Field(default_factory=list, description="List of skill tags")
    capacity_hours_per_week: float = Field(default=40.0, ge=0, le=168)
    cost_rate: Optional[float] = Field(None, ge=0, description="Internal cost rate per hour")
    bill_rate: Optional[float] = Field(None, ge=0, description="Default billing rate per hour")
    is_active: bool = True
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None


class ResourceCreate(ResourceBase):
    pass


class ResourceUpdate(BaseModel):
    user_id: Optional[int] = None
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[str] = None
    job_title: Optional[str] = None
    grade: Optional[str] = None
    office: Optional[str] = None
    practice: Optional[str] = None
    skills: Optional[list[str]] = None
    capacity_hours_per_week: Optional[float] = Field(None, ge=0, le=168)
    cost_rate: Optional[float] = Field(None, ge=0)
    bill_rate: Optional[float] = Field(None, ge=0)
    is_active: Optional[bool] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None


class ResourceResponse(ResourceBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    total_allocated_hours: Optional[float] = None
    available_hours: Optional[float] = None

    model_config = {"from_attributes": True}


class ResourceListResponse(BaseModel):
    resources: list[ResourceResponse]
    total: int


# ---------------------------------------------------------------------------
# Resource Allocation schemas
# ---------------------------------------------------------------------------

class ResourceAllocationBase(BaseModel):
    resource_id: int
    project_id: int
    phase_id: Optional[int] = None
    role_on_project: Optional[str] = Field(None, max_length=100)
    start_date: date
    end_date: date
    hours_per_week: float = Field(..., gt=0, le=168)
    total_hours: Optional[float] = Field(None, ge=0)
    bill_rate: Optional[float] = Field(None, ge=0)
    cost_rate: Optional[float] = Field(None, ge=0)
    status: ResourceAllocationStatus = ResourceAllocationStatus.TENTATIVE
    notes: Optional[str] = None

    @field_validator("end_date")
    @classmethod
    def alloc_end_after_start(cls, v: date, info) -> date:
        start = info.data.get("start_date")
        if start is not None and v < start:
            raise ValueError("Allocation end_date must be on or after start_date")
        return v


class ResourceAllocationCreate(ResourceAllocationBase):
    pass


class ResourceAllocationUpdate(BaseModel):
    phase_id: Optional[int] = None
    role_on_project: Optional[str] = Field(None, max_length=100)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    hours_per_week: Optional[float] = Field(None, gt=0, le=168)
    total_hours: Optional[float] = Field(None, ge=0)
    bill_rate: Optional[float] = Field(None, ge=0)
    cost_rate: Optional[float] = Field(None, ge=0)
    status: Optional[ResourceAllocationStatus] = None
    notes: Optional[str] = None


class ResourceAllocationResponse(ResourceAllocationBase):
    id: int
    resource_name: Optional[str] = None
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ResourceAllocationListResponse(BaseModel):
    allocations: list[ResourceAllocationResponse]
    total: int


# ---------------------------------------------------------------------------
# Resource Demand schemas
# ---------------------------------------------------------------------------

class ResourceDemandBase(BaseModel):
    project_id: int
    phase_id: Optional[int] = None
    role_required: str = Field(..., min_length=1, max_length=255)
    grade_required: Optional[str] = None
    skills_required: list[str] = Field(default_factory=list)
    start_date: date
    end_date: date
    hours_per_week: float = Field(..., gt=0, le=168)
    total_hours: Optional[float] = Field(None, ge=0)
    bill_rate: Optional[float] = Field(None, ge=0)
    priority: DemandPriority = DemandPriority.MEDIUM
    status: DemandStatus = DemandStatus.OPEN
    assigned_resource_id: Optional[int] = None
    notes: Optional[str] = None

    @field_validator("end_date")
    @classmethod
    def demand_end_after_start(cls, v: date, info) -> date:
        start = info.data.get("start_date")
        if start is not None and v < start:
            raise ValueError("Demand end_date must be on or after start_date")
        return v


class ResourceDemandCreate(ResourceDemandBase):
    pass


class ResourceDemandUpdate(BaseModel):
    phase_id: Optional[int] = None
    role_required: Optional[str] = Field(None, min_length=1, max_length=255)
    grade_required: Optional[str] = None
    skills_required: Optional[list[str]] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    hours_per_week: Optional[float] = Field(None, gt=0, le=168)
    total_hours: Optional[float] = Field(None, ge=0)
    bill_rate: Optional[float] = Field(None, ge=0)
    priority: Optional[DemandPriority] = None
    status: Optional[DemandStatus] = None
    assigned_resource_id: Optional[int] = None
    notes: Optional[str] = None


class ResourceDemandResponse(ResourceDemandBase):
    id: int
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    assigned_resource_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ResourceDemandListResponse(BaseModel):
    demands: list[ResourceDemandResponse]
    total: int
