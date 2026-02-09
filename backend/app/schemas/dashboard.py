"""
Dashboard schemas for aggregated views.

Aligned with existing ORM models.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import date


# ---------------------------------------------------------------------------
# Delivery Dashboard
# ---------------------------------------------------------------------------

class ProjectHealthSummary(BaseModel):
    total_projects: int
    green: int
    amber: int
    red: int


class MilestoneSummary(BaseModel):
    total: int
    upcoming_30_days: int
    overdue: int


class DeliveryDashboard(BaseModel):
    project_health: ProjectHealthSummary
    milestones: MilestoneSummary
    active_projects: int
    team_utilisation_percentage: float


# ---------------------------------------------------------------------------
# Resource Dashboard
# ---------------------------------------------------------------------------

class ResourceDashboard(BaseModel):
    total_resources: int
    available_resources: int
    average_utilisation: float
    total_capacity_hours: float
    total_allocated_hours: float
    open_demands: int


# ---------------------------------------------------------------------------
# Finance Dashboard
# ---------------------------------------------------------------------------

class FinanceDashboard(BaseModel):
    total_revenue: float
    total_cost: float
    gross_margin: float
    margin_percentage: float
    total_wip: float
    pending_invoices: float
    total_billed: float


# ---------------------------------------------------------------------------
# Leadership Dashboard
# ---------------------------------------------------------------------------

class LeadershipDashboard(BaseModel):
    active_projects: int
    pipeline_value: float
    weighted_pipeline: float
    total_revenue: float
    average_utilisation: float
    project_health: ProjectHealthSummary
    open_demands: int
    pending_approvals: int


# ---------------------------------------------------------------------------
# Personal Dashboard
# ---------------------------------------------------------------------------

class PersonalTimesheet(BaseModel):
    id: int
    week_starting: date
    status: str
    total_hours: float


class PersonalProject(BaseModel):
    id: int
    name: str
    role: Optional[str] = None
    status: str
    health_status: str


class PersonalDashboard(BaseModel):
    recent_timesheets: list[PersonalTimesheet]
    my_projects: list[PersonalProject]
    pending_approvals: int
    hours_this_week: float
    hours_this_month: float
