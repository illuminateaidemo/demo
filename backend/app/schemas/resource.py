"""
Resource, ResourceAllocation, and ResourceDemand schemas.

Aligned with existing ORM models.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from enum import Enum


class AllocationStatus(str, Enum):
    REQUESTED = "REQUESTED"
    TENTATIVE = "TENTATIVE"
    CONFIRMED = "CONFIRMED"
    RELEASED = "RELEASED"


class DemandStatus(str, Enum):
    OPEN = "OPEN"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    FILLED = "FILLED"
    CANCELLED = "CANCELLED"


# ---------------------------------------------------------------------------
# Resource schemas
# ---------------------------------------------------------------------------

class ResourceBase(BaseModel):
    user_id: int
    job_title: Optional[str] = None
    grade: Optional[str] = None
    cost_rate: Optional[float] = Field(None, ge=0)
    bill_rate: Optional[float] = Field(None, ge=0)
    capacity_hours_per_week: float = Field(default=40.0, ge=0)
    skills: Optional[dict] = None
    location: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_available: bool = True


class ResourceCreate(ResourceBase):
    pass


class ResourceUpdate(BaseModel):
    job_title: Optional[str] = None
    grade: Optional[str] = None
    cost_rate: Optional[float] = Field(None, ge=0)
    bill_rate: Optional[float] = Field(None, ge=0)
    capacity_hours_per_week: Optional[float] = Field(None, ge=0)
    skills: Optional[dict] = None
    location: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_available: Optional[bool] = None


class AllocationResponse(BaseModel):
    id: int
    resource_id: int
    project_id: int
    phase_id: Optional[int] = None
    role_on_project: Optional[str] = None
    start_date: date
    end_date: date
    hours_per_week: float
    status: str
    project_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ResourceResponse(ResourceBase):
    id: int
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    allocations: list[AllocationResponse] = []

    model_config = {"from_attributes": True}


class ResourceListResponse(BaseModel):
    resources: list[ResourceResponse]
    total: int


# ---------------------------------------------------------------------------
# Allocation schemas
# ---------------------------------------------------------------------------

class AllocationBase(BaseModel):
    resource_id: int
    project_id: int
    phase_id: Optional[int] = None
    role_on_project: Optional[str] = None
    start_date: date
    end_date: date
    hours_per_week: float = Field(default=40.0, ge=0)
    status: AllocationStatus = AllocationStatus.REQUESTED


class AllocationCreate(AllocationBase):
    pass


class AllocationUpdate(BaseModel):
    resource_id: Optional[int] = None
    project_id: Optional[int] = None
    phase_id: Optional[int] = None
    role_on_project: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    hours_per_week: Optional[float] = Field(None, ge=0)
    status: Optional[AllocationStatus] = None


# ---------------------------------------------------------------------------
# ResourceDemand schemas
# ---------------------------------------------------------------------------

class ResourceDemandBase(BaseModel):
    project_id: int
    role_required: str = Field(..., min_length=1, max_length=200)
    grade_required: Optional[str] = None
    skills_required: Optional[dict] = None
    hours_per_week: float = Field(default=40.0, ge=0)
    start_date: date
    end_date: date
    status: DemandStatus = DemandStatus.OPEN


class ResourceDemandCreate(ResourceDemandBase):
    pass


class ResourceDemandUpdate(BaseModel):
    project_id: Optional[int] = None
    role_required: Optional[str] = Field(None, min_length=1, max_length=200)
    grade_required: Optional[str] = None
    skills_required: Optional[dict] = None
    hours_per_week: Optional[float] = Field(None, ge=0)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[DemandStatus] = None


class ResourceDemandResponse(ResourceDemandBase):
    id: int
    project_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ResourceDemandListResponse(BaseModel):
    demands: list[ResourceDemandResponse]
    total: int


# ---------------------------------------------------------------------------
# Utilisation / Capacity schemas
# ---------------------------------------------------------------------------

class UtilisationResponse(BaseModel):
    resource_id: int
    user_name: str
    start_date: date
    end_date: date
    capacity_hours: float
    allocated_hours: float
    logged_hours: float
    utilisation_percentage: float


class CapacityOverviewEntry(BaseModel):
    resource_id: int
    user_name: str
    grade: Optional[str] = None
    capacity_hours_per_week: float
    allocated_hours_per_week: float
    available_hours_per_week: float
    utilisation_percentage: float


class CapacityOverviewResponse(BaseModel):
    entries: list[CapacityOverviewEntry]
    total_capacity: float
    total_allocated: float
    total_available: float
    average_utilisation: float
