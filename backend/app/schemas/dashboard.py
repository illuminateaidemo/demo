"""
Dashboard aggregate schemas for leadership, delivery, finance, and resource views.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


# ---------------------------------------------------------------------------
# Utilisation Summary
# ---------------------------------------------------------------------------

class UtilisationSummary(BaseModel):
    """Resource utilisation metrics for a given period."""
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    target_hours: float = 0.0
    actual_hours: float = 0.0
    billable_hours: float = 0.0
    non_billable_hours: float = 0.0
    leave_hours: float = 0.0
    utilisation_pct: float = Field(
        default=0.0,
        description="(actual_hours / target_hours) * 100"
    )
    billable_pct: float = Field(
        default=0.0,
        description="(billable_hours / target_hours) * 100"
    )
    by_practice: dict[str, float] = Field(
        default_factory=dict,
        description="Practice name -> utilisation_pct"
    )
    by_office: dict[str, float] = Field(
        default_factory=dict,
        description="Office name -> utilisation_pct"
    )


# ---------------------------------------------------------------------------
# Project Health Summary
# ---------------------------------------------------------------------------

class ProjectHealthSummary(BaseModel):
    """Aggregated project health overview."""
    total_projects: int = 0
    active_projects: int = 0
    green: int = 0
    amber: int = 0
    red: int = 0
    not_set: int = 0
    by_practice: dict[str, dict[str, int]] = Field(
        default_factory=dict,
        description="Practice name -> {GREEN: n, AMBER: n, RED: n}"
    )
    by_delivery_lead: dict[str, dict[str, int]] = Field(
        default_factory=dict,
        description="Delivery lead name -> {GREEN: n, AMBER: n, RED: n}"
    )
    projects_at_risk: list[dict] = Field(
        default_factory=list,
        description="List of RED/AMBER projects with basic details"
    )


# ---------------------------------------------------------------------------
# Financial Summary
# ---------------------------------------------------------------------------

class FinancialSummary(BaseModel):
    """High-level financial metrics."""
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    total_revenue: float = 0.0
    total_cost: float = 0.0
    gross_margin: float = 0.0
    margin_pct: float = Field(
        default=0.0,
        description="(gross_margin / total_revenue) * 100"
    )
    wip_value: float = 0.0
    outstanding_billing: float = 0.0
    total_billed: float = 0.0
    total_collected: float = 0.0
    overdue_amount: float = 0.0
    currency: str = "GBP"
    revenue_by_practice: dict[str, float] = Field(
        default_factory=dict,
        description="Practice name -> revenue"
    )
    revenue_by_client: dict[str, float] = Field(
        default_factory=dict,
        description="Client name -> revenue"
    )
    margin_by_project: dict[str, float] = Field(
        default_factory=dict,
        description="Project code -> margin_pct"
    )


# ---------------------------------------------------------------------------
# Resource Capacity Summary
# ---------------------------------------------------------------------------

class ResourceCapacitySummary(BaseModel):
    """Resource capacity and allocation overview."""
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    total_resources: int = 0
    total_capacity: float = Field(
        default=0.0,
        description="Total available hours across all resources"
    )
    allocated_hours: float = 0.0
    available_hours: float = 0.0
    utilisation_pct: float = 0.0
    over_allocated_count: int = Field(
        default=0,
        description="Number of resources allocated beyond capacity"
    )
    under_allocated_count: int = Field(
        default=0,
        description="Number of resources allocated below 50% capacity"
    )
    bench_count: int = Field(
        default=0,
        description="Number of resources with zero allocation"
    )
    by_practice: dict[str, dict[str, float]] = Field(
        default_factory=dict,
        description="Practice -> {capacity, allocated, available}"
    )
    by_office: dict[str, dict[str, float]] = Field(
        default_factory=dict,
        description="Office -> {capacity, allocated, available}"
    )
    by_grade: dict[str, dict[str, float]] = Field(
        default_factory=dict,
        description="Grade -> {capacity, allocated, available}"
    )


# ---------------------------------------------------------------------------
# Pipeline Summary
# ---------------------------------------------------------------------------

class PipelineSummary(BaseModel):
    """Sales pipeline overview for dashboards."""
    total_opportunities: int = 0
    total_value: float = 0.0
    weighted_value: float = 0.0
    count_by_status: dict[str, int] = Field(default_factory=dict)
    value_by_status: dict[str, float] = Field(default_factory=dict)
    value_by_practice: dict[str, float] = Field(default_factory=dict)
    average_deal_size: float = 0.0
    win_rate_pct: float = 0.0
    currency: str = "GBP"


# ---------------------------------------------------------------------------
# Composite Dashboard schemas
# ---------------------------------------------------------------------------

class LeadershipDashboard(BaseModel):
    """Executive / leadership view combining all key metrics."""
    utilisation: UtilisationSummary = Field(default_factory=UtilisationSummary)
    project_health: ProjectHealthSummary = Field(default_factory=ProjectHealthSummary)
    financials: FinancialSummary = Field(default_factory=FinancialSummary)
    resource_capacity: ResourceCapacitySummary = Field(default_factory=ResourceCapacitySummary)
    pipeline: PipelineSummary = Field(default_factory=PipelineSummary)
    as_of_date: Optional[date] = None


class DeliveryDashboard(BaseModel):
    """Delivery lead view focused on project execution."""
    project_health: ProjectHealthSummary = Field(default_factory=ProjectHealthSummary)
    utilisation: UtilisationSummary = Field(default_factory=UtilisationSummary)
    resource_capacity: ResourceCapacitySummary = Field(default_factory=ResourceCapacitySummary)
    my_projects: list[dict] = Field(
        default_factory=list,
        description="Lightweight project summaries for the current delivery lead"
    )
    pending_approvals: int = 0
    overdue_timesheets: int = 0
    as_of_date: Optional[date] = None


class FinanceDashboard(BaseModel):
    """Finance team view focused on billing, WIP, and revenue."""
    financials: FinancialSummary = Field(default_factory=FinancialSummary)
    wip_aging: dict[str, float] = Field(
        default_factory=dict,
        description="Aging bucket (e.g. '0-30 days') -> WIP value"
    )
    billing_forecast: list[dict] = Field(
        default_factory=list,
        description="Upcoming billing milestones with dates and amounts"
    )
    revenue_trend: list[dict] = Field(
        default_factory=list,
        description="Monthly revenue data points"
    )
    margin_trend: list[dict] = Field(
        default_factory=list,
        description="Monthly margin data points"
    )
    outstanding_expenses: float = 0.0
    pending_approvals: int = 0
    as_of_date: Optional[date] = None


class ResourceDashboard(BaseModel):
    """Resource manager view focused on capacity planning."""
    resource_capacity: ResourceCapacitySummary = Field(default_factory=ResourceCapacitySummary)
    utilisation: UtilisationSummary = Field(default_factory=UtilisationSummary)
    open_demands: list[dict] = Field(
        default_factory=list,
        description="Unfilled resource demands with project details"
    )
    upcoming_roll_offs: list[dict] = Field(
        default_factory=list,
        description="Resources ending allocations in the next 30 days"
    )
    bench_resources: list[dict] = Field(
        default_factory=list,
        description="Resources with no current allocation"
    )
    skill_gaps: dict[str, int] = Field(
        default_factory=dict,
        description="Skill -> number of open demands requiring that skill"
    )
    as_of_date: Optional[date] = None


# ---------------------------------------------------------------------------
# Shared query parameters schema
# ---------------------------------------------------------------------------

class DashboardFilters(BaseModel):
    """Common filters applied to dashboard queries."""
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    practice: Optional[str] = None
    office: Optional[str] = None
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    delivery_lead_id: Optional[int] = None
