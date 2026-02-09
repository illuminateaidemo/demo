"""
Dashboard routes providing aggregated views for different personas.
"""

from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.approval import Approval
from app.models.financial import BillingMilestone, WIPEntry
from app.models.opportunity import Opportunity
from app.models.project import Project
from app.models.resource import Allocation, Resource, ResourceDemand
from app.models.timesheet import Timesheet, TimesheetEntry
from app.models.user import User
from app.schemas.dashboard import (
    DeliveryDashboard,
    FinanceDashboard,
    LeadershipDashboard,
    MilestoneSummary,
    PersonalDashboard,
    PersonalProject,
    PersonalTimesheet,
    ProjectHealthSummary,
    ResourceDashboard,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _project_health_summary(db: AsyncSession) -> ProjectHealthSummary:
    result = await db.execute(
        select(Project).where(Project.is_deleted == False, Project.status == "ACTIVE")
    )
    projects = result.scalars().all()
    green = amber = red = 0
    for p in projects:
        if p.health_status == "GREEN":
            green += 1
        elif p.health_status == "AMBER":
            amber += 1
        elif p.health_status == "RED":
            red += 1
    return ProjectHealthSummary(
        total_projects=len(projects), green=green, amber=amber, red=red
    )


async def _milestone_summary(db: AsyncSession) -> MilestoneSummary:
    total_result = await db.execute(select(func.count()).select_from(BillingMilestone))
    total = total_result.scalar() or 0

    today = date.today()
    thirty_days = today + timedelta(days=30)

    upcoming_result = await db.execute(
        select(func.count()).select_from(
            select(BillingMilestone)
            .where(
                BillingMilestone.status.in_(["PENDING", "READY"]),
                BillingMilestone.due_date >= today,
                BillingMilestone.due_date <= thirty_days,
            )
            .subquery()
        )
    )
    upcoming = upcoming_result.scalar() or 0

    overdue_result = await db.execute(
        select(func.count()).select_from(
            select(BillingMilestone)
            .where(
                BillingMilestone.status.in_(["PENDING", "READY"]),
                BillingMilestone.due_date < today,
            )
            .subquery()
        )
    )
    overdue = overdue_result.scalar() or 0

    return MilestoneSummary(total=total, upcoming_30_days=upcoming, overdue=overdue)


async def _team_utilisation(db: AsyncSession) -> float:
    result = await db.execute(select(Resource).where(Resource.is_available == True))
    resources = result.scalars().all()
    if not resources:
        return 0.0

    today = date.today()
    total_cap = 0.0
    total_alloc = 0.0
    for res in resources:
        total_cap += res.capacity_hours_per_week
        for alloc in res.allocations:
            if alloc.status in ("CONFIRMED", "ACTIVE") and alloc.start_date <= today <= alloc.end_date:
                total_alloc += alloc.hours_per_week

    return round((total_alloc / total_cap * 100), 1) if total_cap > 0 else 0.0


# ---------------------------------------------------------------------------
# Delivery Dashboard
# ---------------------------------------------------------------------------


@router.get("/delivery", response_model=DeliveryDashboard)
async def delivery_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DeliveryDashboard:
    """Delivery dashboard: project health, milestones, team utilisation."""
    health = await _project_health_summary(db)
    milestones = await _milestone_summary(db)
    utilisation = await _team_utilisation(db)

    active_result = await db.execute(
        select(func.count()).select_from(
            select(Project)
            .where(Project.is_deleted == False, Project.status == "ACTIVE")
            .subquery()
        )
    )
    active_projects = active_result.scalar() or 0

    return DeliveryDashboard(
        project_health=health,
        milestones=milestones,
        active_projects=active_projects,
        team_utilisation_percentage=utilisation,
    )


# ---------------------------------------------------------------------------
# Resource Dashboard
# ---------------------------------------------------------------------------


@router.get("/resources", response_model=ResourceDashboard)
async def resource_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResourceDashboard:
    """Resource dashboard: capacity, utilisation, demand."""
    total_result = await db.execute(select(func.count()).select_from(Resource))
    total_resources = total_result.scalar() or 0

    available_result = await db.execute(
        select(func.count()).select_from(
            select(Resource).where(Resource.is_available == True).subquery()
        )
    )
    available_resources = available_result.scalar() or 0

    res_result = await db.execute(select(Resource).where(Resource.is_available == True))
    resources = res_result.scalars().all()

    today = date.today()
    total_cap = 0.0
    total_alloc = 0.0
    for res in resources:
        total_cap += res.capacity_hours_per_week
        for alloc in res.allocations:
            if alloc.status in ("CONFIRMED", "ACTIVE") and alloc.start_date <= today <= alloc.end_date:
                total_alloc += alloc.hours_per_week

    avg_util = round((total_alloc / total_cap * 100), 1) if total_cap > 0 else 0.0

    demand_result = await db.execute(
        select(func.count()).select_from(
            select(ResourceDemand)
            .where(ResourceDemand.status.in_(["OPEN", "PARTIALLY_FILLED"]))
            .subquery()
        )
    )
    open_demands = demand_result.scalar() or 0

    return ResourceDashboard(
        total_resources=total_resources,
        available_resources=available_resources,
        average_utilisation=avg_util,
        total_capacity_hours=total_cap,
        total_allocated_hours=total_alloc,
        open_demands=open_demands,
    )


# ---------------------------------------------------------------------------
# Finance Dashboard
# ---------------------------------------------------------------------------


@router.get("/finance", response_model=FinanceDashboard)
async def finance_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FinanceDashboard:
    """Finance dashboard: revenue, margins, WIP, billing."""
    wip_result = await db.execute(
        select(
            func.coalesce(func.sum(WIPEntry.revenue), 0.0),
            func.coalesce(func.sum(WIPEntry.cost), 0.0),
        ).where(WIPEntry.status == "POSTED")
    )
    row = wip_result.one()
    total_revenue = float(row[0])
    total_cost = float(row[1])
    gross_margin = total_revenue - total_cost
    margin_pct = round((gross_margin / total_revenue * 100), 1) if total_revenue > 0 else 0.0

    draft_wip_result = await db.execute(
        select(func.coalesce(func.sum(WIPEntry.revenue), 0.0)).where(
            WIPEntry.status.in_(["DRAFT", "REVIEWED"])
        )
    )
    total_wip = float(draft_wip_result.scalar() or 0.0)

    pending_result = await db.execute(
        select(func.coalesce(func.sum(BillingMilestone.amount), 0.0)).where(
            BillingMilestone.status == "READY"
        )
    )
    pending_invoices = float(pending_result.scalar() or 0.0)

    billed_result = await db.execute(
        select(func.coalesce(func.sum(BillingMilestone.amount), 0.0)).where(
            BillingMilestone.status == "INVOICED"
        )
    )
    total_billed = float(billed_result.scalar() or 0.0)

    return FinanceDashboard(
        total_revenue=round(total_revenue, 2),
        total_cost=round(total_cost, 2),
        gross_margin=round(gross_margin, 2),
        margin_percentage=margin_pct,
        total_wip=round(total_wip, 2),
        pending_invoices=round(pending_invoices, 2),
        total_billed=round(total_billed, 2),
    )


# ---------------------------------------------------------------------------
# Leadership Dashboard
# ---------------------------------------------------------------------------


@router.get("/leadership", response_model=LeadershipDashboard)
async def leadership_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LeadershipDashboard:
    """Leadership dashboard: combined KPIs."""
    health = await _project_health_summary(db)

    active_result = await db.execute(
        select(func.count()).select_from(
            select(Project)
            .where(Project.is_deleted == False, Project.status == "ACTIVE")
            .subquery()
        )
    )
    active_projects = active_result.scalar() or 0

    pipeline_result = await db.execute(
        select(
            func.coalesce(func.sum(Opportunity.value), 0.0),
        ).where(Opportunity.status.in_(["IDENTIFIED", "QUALIFYING", "PROPOSAL", "NEGOTIATION"]))
    )
    pipeline_value = float(pipeline_result.scalar() or 0.0)

    weighted_result = await db.execute(
        select(Opportunity).where(
            Opportunity.status.in_(["IDENTIFIED", "QUALIFYING", "PROPOSAL", "NEGOTIATION"])
        )
    )
    weighted_pipeline = 0.0
    for opp in weighted_result.scalars().all():
        weighted_pipeline += opp.value * (opp.probability / 100.0)

    revenue_result = await db.execute(
        select(func.coalesce(func.sum(WIPEntry.revenue), 0.0)).where(
            WIPEntry.status == "POSTED"
        )
    )
    total_revenue = float(revenue_result.scalar() or 0.0)

    avg_util = await _team_utilisation(db)

    demand_result = await db.execute(
        select(func.count()).select_from(
            select(ResourceDemand)
            .where(ResourceDemand.status.in_(["OPEN", "PARTIALLY_FILLED"]))
            .subquery()
        )
    )
    open_demands = demand_result.scalar() or 0

    approval_result = await db.execute(
        select(func.count()).select_from(
            select(Approval).where(Approval.status == "PENDING").subquery()
        )
    )
    pending_approvals = approval_result.scalar() or 0

    return LeadershipDashboard(
        active_projects=active_projects,
        pipeline_value=round(pipeline_value, 2),
        weighted_pipeline=round(weighted_pipeline, 2),
        total_revenue=round(total_revenue, 2),
        average_utilisation=avg_util,
        project_health=health,
        open_demands=open_demands,
        pending_approvals=pending_approvals,
    )


# ---------------------------------------------------------------------------
# Personal Dashboard
# ---------------------------------------------------------------------------


@router.get("/my", response_model=PersonalDashboard)
async def personal_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PersonalDashboard:
    """Personal dashboard for the current user."""
    # Recent timesheets
    ts_result = await db.execute(
        select(Timesheet)
        .where(Timesheet.user_id == current_user.id)
        .order_by(Timesheet.week_start_date.desc())
        .limit(5)
    )
    timesheets = ts_result.scalars().all()
    recent_timesheets = [
        PersonalTimesheet(
            id=ts.id,
            week_start_date=ts.week_start_date,
            status=ts.status,
            total_hours=ts.total_hours,
        )
        for ts in timesheets
    ]

    # My projects (via allocations)
    alloc_result = await db.execute(
        select(Allocation).where(
            Allocation.resource_id.in_(
                select(Resource.id).where(Resource.user_id == current_user.id)
            ),
            Allocation.status.in_(["CONFIRMED", "ACTIVE"]),
        )
    )
    allocations = alloc_result.scalars().all()
    my_projects = []
    seen_projects = set()
    for alloc in allocations:
        if alloc.project_id not in seen_projects and alloc.project:
            seen_projects.add(alloc.project_id)
            my_projects.append(
                PersonalProject(
                    id=alloc.project.id,
                    name=alloc.project.name,
                    role=None,
                    status=alloc.project.status,
                    health_status=alloc.project.health_status,
                )
            )

    # Also include projects where user is the manager
    managed_result = await db.execute(
        select(Project).where(
            Project.manager_id == current_user.id,
            Project.is_deleted == False,
            Project.status.in_(["ACTIVE", "DRAFT"]),
        )
    )
    for proj in managed_result.scalars().all():
        if proj.id not in seen_projects:
            seen_projects.add(proj.id)
            my_projects.append(
                PersonalProject(
                    id=proj.id,
                    name=proj.name,
                    role="Manager",
                    status=proj.status,
                    health_status=proj.health_status,
                )
            )

    # Pending approvals count
    approval_result = await db.execute(
        select(func.count()).select_from(
            select(Approval)
            .where(
                Approval.assigned_to_id == current_user.id,
                Approval.status == "PENDING",
            )
            .subquery()
        )
    )
    pending_approvals = approval_result.scalar() or 0

    # Hours this week
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)

    week_hours_result = await db.execute(
        select(func.coalesce(func.sum(TimesheetEntry.hours), 0.0))
        .join(Timesheet, TimesheetEntry.timesheet_id == Timesheet.id)
        .where(
            Timesheet.user_id == current_user.id,
            TimesheetEntry.date >= monday,
            TimesheetEntry.date <= sunday,
        )
    )
    hours_this_week = float(week_hours_result.scalar() or 0.0)

    # Hours this month
    first_of_month = today.replace(day=1)
    month_hours_result = await db.execute(
        select(func.coalesce(func.sum(TimesheetEntry.hours), 0.0))
        .join(Timesheet, TimesheetEntry.timesheet_id == Timesheet.id)
        .where(
            Timesheet.user_id == current_user.id,
            TimesheetEntry.date >= first_of_month,
            TimesheetEntry.date <= today,
        )
    )
    hours_this_month = float(month_hours_result.scalar() or 0.0)

    return PersonalDashboard(
        recent_timesheets=recent_timesheets,
        my_projects=my_projects,
        pending_approvals=pending_approvals,
        hours_this_week=hours_this_week,
        hours_this_month=hours_this_month,
    )
