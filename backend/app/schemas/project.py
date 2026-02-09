"""
Project, project phase, and project health log schemas.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date, datetime
from enum import Enum


class ProjectStatus(str, Enum):
    DRAFT = "DRAFT"
    PLANNING = "PLANNING"
    ACTIVE = "ACTIVE"
    ON_HOLD = "ON_HOLD"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class CommercialModel(str, Enum):
    TIME_AND_MATERIALS = "TIME_AND_MATERIALS"
    FIXED_PRICE = "FIXED_PRICE"
    RETAINER = "RETAINER"
    MANAGED_SERVICE = "MANAGED_SERVICE"
    MIXED = "MIXED"


class HealthStatus(str, Enum):
    GREEN = "GREEN"
    AMBER = "AMBER"
    RED = "RED"
    NOT_SET = "NOT_SET"


# ---------------------------------------------------------------------------
# Project Phase schemas
# ---------------------------------------------------------------------------

class ProjectPhaseBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget_hours: Optional[float] = Field(None, ge=0)
    budget_amount: Optional[float] = Field(None, ge=0)
    status: ProjectStatus = ProjectStatus.DRAFT
    sort_order: int = 0

    @field_validator("end_date")
    @classmethod
    def phase_end_after_start(cls, v: Optional[date], info) -> Optional[date]:
        start = info.data.get("start_date")
        if v is not None and start is not None and v < start:
            raise ValueError("Phase end_date must be on or after start_date")
        return v


class ProjectPhaseCreate(ProjectPhaseBase):
    project_id: int


class ProjectPhaseUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget_hours: Optional[float] = Field(None, ge=0)
    budget_amount: Optional[float] = Field(None, ge=0)
    status: Optional[ProjectStatus] = None
    sort_order: Optional[int] = None


class ProjectPhaseResponse(ProjectPhaseBase):
    id: int
    project_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Project Health Log schemas
# ---------------------------------------------------------------------------

class ProjectHealthLogBase(BaseModel):
    overall_health: HealthStatus
    scope_health: HealthStatus = HealthStatus.NOT_SET
    schedule_health: HealthStatus = HealthStatus.NOT_SET
    budget_health: HealthStatus = HealthStatus.NOT_SET
    risk_health: HealthStatus = HealthStatus.NOT_SET
    summary: Optional[str] = None
    risks: Optional[str] = None
    issues: Optional[str] = None
    next_steps: Optional[str] = None
    reported_by_id: Optional[int] = None


class ProjectHealthLogCreate(ProjectHealthLogBase):
    project_id: int


class ProjectHealthLogResponse(ProjectHealthLogBase):
    id: int
    project_id: int
    reported_at: datetime
    reported_by_name: Optional[str] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Project schemas
# ---------------------------------------------------------------------------

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1, max_length=50, description="Unique project code")
    client_id: int
    opportunity_id: Optional[int] = None
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.DRAFT
    commercial_model: CommercialModel = CommercialModel.TIME_AND_MATERIALS
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget_hours: float = Field(default=0, ge=0)
    budget_amount: float = Field(default=0, ge=0)
    currency: str = Field(default="GBP", max_length=3)
    bill_rate: Optional[float] = Field(None, ge=0, description="Default billing rate per hour")
    cost_rate: Optional[float] = Field(None, ge=0, description="Default cost rate per hour")
    practice: Optional[str] = None
    delivery_lead_id: Optional[int] = None
    project_manager_id: Optional[int] = None
    office: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("end_date")
    @classmethod
    def end_after_start(cls, v: Optional[date], info) -> Optional[date]:
        start = info.data.get("start_date")
        if v is not None and start is not None and v < start:
            raise ValueError("end_date must be on or after start_date")
        return v


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    client_id: Optional[int] = None
    opportunity_id: Optional[int] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    commercial_model: Optional[CommercialModel] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget_hours: Optional[float] = Field(None, ge=0)
    budget_amount: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    bill_rate: Optional[float] = Field(None, ge=0)
    cost_rate: Optional[float] = Field(None, ge=0)
    practice: Optional[str] = None
    delivery_lead_id: Optional[int] = None
    project_manager_id: Optional[int] = None
    office: Optional[str] = None
    notes: Optional[str] = None


class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    client_name: Optional[str] = None
    delivery_lead_name: Optional[str] = None
    project_manager_name: Optional[str] = None
    latest_health: Optional[HealthStatus] = None
    phases: list[ProjectPhaseResponse] = []
    actual_hours: Optional[float] = None
    actual_cost: Optional[float] = None
    budget_consumed_pct: Optional[float] = None

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]
    total: int


class ProjectSummary(BaseModel):
    """Lightweight project reference used in dropdowns and lists."""
    id: int
    name: str
    code: str
    client_name: Optional[str] = None
    status: ProjectStatus

    model_config = {"from_attributes": True}
