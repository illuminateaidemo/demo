"""
Project, ProjectPhase, and ProjectHealthLog schemas.

Aligned with existing ORM models.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from enum import Enum


class ProjectStatus(str, Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    ON_HOLD = "ON_HOLD"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class CommercialModel(str, Enum):
    FIXED_PRICE = "FIXED_PRICE"
    TIME_AND_MATERIALS = "TIME_AND_MATERIALS"
    RETAINER = "RETAINER"
    MILESTONE = "MILESTONE"


class HealthStatus(str, Enum):
    GREEN = "GREEN"
    AMBER = "AMBER"
    RED = "RED"


class PhaseStatus(str, Enum):
    PLANNED = "PLANNED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


# ---------------------------------------------------------------------------
# ProjectPhase schemas
# ---------------------------------------------------------------------------

class ProjectPhaseBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget_hours: Optional[float] = None
    budget_amount: Optional[float] = None
    status: PhaseStatus = PhaseStatus.PLANNED
    sort_order: int = 0


class ProjectPhaseCreate(ProjectPhaseBase):
    pass


class ProjectPhaseUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget_hours: Optional[float] = None
    budget_amount: Optional[float] = None
    status: Optional[PhaseStatus] = None
    sort_order: Optional[int] = None


class ProjectPhaseResponse(ProjectPhaseBase):
    id: int
    project_id: int

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# HealthLog schemas
# ---------------------------------------------------------------------------

class HealthLogCreate(BaseModel):
    status: HealthStatus
    narrative: Optional[str] = None


class HealthLogResponse(BaseModel):
    id: int
    project_id: int
    status: str
    narrative: Optional[str] = None
    logged_by_id: Optional[int] = None
    logged_by_name: Optional[str] = None
    logged_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Project schemas
# ---------------------------------------------------------------------------

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1, max_length=50)
    client_id: int
    opportunity_id: Optional[int] = None
    project_manager_id: Optional[int] = None
    status: ProjectStatus = ProjectStatus.DRAFT
    commercial_model: Optional[CommercialModel] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget_hours: Optional[float] = Field(None, ge=0)
    budget_amount: Optional[float] = Field(None, ge=0)
    currency: str = "USD"
    description: Optional[str] = None
    health_status: HealthStatus = HealthStatus.GREEN
    health_narrative: Optional[str] = None
    practice: Optional[str] = None
    office: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    client_id: Optional[int] = None
    opportunity_id: Optional[int] = None
    project_manager_id: Optional[int] = None
    status: Optional[ProjectStatus] = None
    commercial_model: Optional[CommercialModel] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget_hours: Optional[float] = Field(None, ge=0)
    budget_amount: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = None
    description: Optional[str] = None
    health_status: Optional[HealthStatus] = None
    health_narrative: Optional[str] = None
    practice: Optional[str] = None
    office: Optional[str] = None


class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime
    updated_at: datetime
    phases: list[ProjectPhaseResponse] = []
    client_name: Optional[str] = None
    manager_name: Optional[str] = None

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]
    total: int


class ProjectFinancialSummary(BaseModel):
    project_id: int
    project_name: str
    budget_hours: Optional[float] = None
    budget_amount: Optional[float] = None
    actual_hours: float = 0.0
    actual_cost: float = 0.0
    actual_revenue: float = 0.0
    hours_remaining: Optional[float] = None
    budget_remaining: Optional[float] = None
    margin_percentage: Optional[float] = None


class ProjectTeamMember(BaseModel):
    resource_id: int
    user_name: str
    grade: Optional[str] = None
    role_on_project: Optional[str] = None
    hours_per_week: float
    start_date: date
    end_date: date
    allocation_status: str
