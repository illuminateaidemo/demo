"""
Project CRUD and management routes (phases, health, financials, team).
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.client import Client
from app.models.project import Project, ProjectHealthLog, ProjectPhase
from app.models.resource import ResourceAllocation
from app.models.timesheet import TimesheetEntry
from app.models.user import User
from app.schemas.project import (
    HealthLogCreate,
    HealthLogResponse,
    ProjectCreate,
    ProjectFinancialSummary,
    ProjectListResponse,
    ProjectPhaseCreate,
    ProjectPhaseResponse,
    ProjectPhaseUpdate,
    ProjectResponse,
    ProjectTeamMember,
    ProjectUpdate,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Project CRUD
# ---------------------------------------------------------------------------


@router.get("/", response_model=ProjectListResponse)
async def list_projects(
    status_filter: Optional[str] = Query(None, alias="status"),
    client_id: Optional[int] = Query(None),
    manager_id: Optional[int] = Query(None),
    practice: Optional[str] = Query(None),
    health: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectListResponse:
    """List projects with optional filters."""
    query = select(Project)

    if status_filter:
        query = query.where(Project.status == status_filter)
    if client_id is not None:
        query = query.where(Project.client_id == client_id)
    if manager_id is not None:
        query = query.where(Project.project_manager_id == manager_id)
    if practice:
        query = query.where(Project.practice == practice)
    if health:
        query = query.where(Project.health_status == health)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Project.name).offset(skip).limit(limit)
    result = await db.execute(query)
    projects = result.scalars().all()

    project_responses = []
    for proj in projects:
        resp = ProjectResponse.model_validate(proj)
        resp.client_name = proj.client.name if proj.client else None
        resp.manager_name = proj.project_manager.full_name if proj.project_manager else None
        project_responses.append(resp)

    return ProjectListResponse(projects=project_responses, total=total)


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_in: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectResponse:
    """Create a new project."""
    client_result = await db.execute(
        select(Client).where(Client.id == project_in.client_id)
    )
    if client_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    existing_code = await db.execute(
        select(Project).where(Project.code == project_in.code)
    )
    if existing_code.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A project with this code already exists",
        )

    project = Project(
        name=project_in.name,
        code=project_in.code,
        client_id=project_in.client_id,
        opportunity_id=project_in.opportunity_id,
        project_manager_id=project_in.project_manager_id or current_user.id,
        status=project_in.status.value,
        commercial_model=project_in.commercial_model.value if project_in.commercial_model else None,
        start_date=project_in.start_date,
        end_date=project_in.end_date,
        budget_hours=project_in.budget_hours,
        budget_amount=project_in.budget_amount,
        currency=project_in.currency,
        description=project_in.description,
        health_status=project_in.health_status.value,
        health_narrative=project_in.health_narrative,
        practice=project_in.practice,
        office=project_in.office,
    )
    db.add(project)
    await db.flush()
    await db.refresh(project)

    resp = ProjectResponse.model_validate(project)
    resp.client_name = project.client.name if project.client else None
    resp.manager_name = project.project_manager.full_name if project.project_manager else None
    return resp


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectResponse:
    """Get a project by ID including phases."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    resp = ProjectResponse.model_validate(project)
    resp.client_name = project.client.name if project.client else None
    resp.manager_name = project.project_manager.full_name if project.project_manager else None
    return resp


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectResponse:
    """Update an existing project."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    update_data = project_in.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] is not None:
        update_data["status"] = update_data["status"].value
    if "health_status" in update_data and update_data["health_status"] is not None:
        update_data["health_status"] = update_data["health_status"].value
    if "commercial_model" in update_data and update_data["commercial_model"] is not None:
        update_data["commercial_model"] = update_data["commercial_model"].value
    for field, value in update_data.items():
        setattr(project, field, value)

    await db.flush()
    await db.refresh(project)

    resp = ProjectResponse.model_validate(project)
    resp.client_name = project.client.name if project.client else None
    resp.manager_name = project.project_manager.full_name if project.project_manager else None
    return resp


# ---------------------------------------------------------------------------
# Project Phases
# ---------------------------------------------------------------------------


@router.post(
    "/{project_id}/phases",
    response_model=ProjectPhaseResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_phase(
    project_id: int,
    phase_in: ProjectPhaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectPhaseResponse:
    """Add a phase to a project."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    phase = ProjectPhase(
        project_id=project_id,
        name=phase_in.name,
        start_date=phase_in.start_date,
        end_date=phase_in.end_date,
        budget_hours=phase_in.budget_hours,
        budget_amount=phase_in.budget_amount,
        status=phase_in.status.value,
        sort_order=phase_in.sort_order,
    )
    db.add(phase)
    await db.flush()
    await db.refresh(phase)
    return phase


@router.put(
    "/{project_id}/phases/{phase_id}",
    response_model=ProjectPhaseResponse,
)
async def update_phase(
    project_id: int,
    phase_id: int,
    phase_in: ProjectPhaseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectPhaseResponse:
    """Update a project phase."""
    result = await db.execute(
        select(ProjectPhase).where(
            ProjectPhase.id == phase_id,
            ProjectPhase.project_id == project_id,
        )
    )
    phase = result.scalar_one_or_none()
    if phase is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phase not found")

    update_data = phase_in.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] is not None:
        update_data["status"] = update_data["status"].value
    for field, value in update_data.items():
        setattr(phase, field, value)

    await db.flush()
    await db.refresh(phase)
    return phase


@router.delete(
    "/{project_id}/phases/{phase_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_phase(
    project_id: int,
    phase_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a project phase."""
    result = await db.execute(
        select(ProjectPhase).where(
            ProjectPhase.id == phase_id,
            ProjectPhase.project_id == project_id,
        )
    )
    phase = result.scalar_one_or_none()
    if phase is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phase not found")

    await db.delete(phase)
    await db.flush()


# ---------------------------------------------------------------------------
# Health Logging
# ---------------------------------------------------------------------------


@router.post(
    "/{project_id}/health",
    response_model=HealthLogResponse,
    status_code=status.HTTP_201_CREATED,
)
async def log_health(
    project_id: int,
    health_in: HealthLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HealthLogResponse:
    """Log a health update for a project and update its current health status."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    log = ProjectHealthLog(
        project_id=project_id,
        status=health_in.status.value,
        narrative=health_in.narrative,
        logged_by_id=current_user.id,
    )
    db.add(log)

    project.health_status = health_in.status.value
    if health_in.narrative is not None:
        project.health_narrative = health_in.narrative

    await db.flush()
    await db.refresh(log)

    resp = HealthLogResponse.model_validate(log)
    resp.logged_by_name = current_user.full_name
    return resp


@router.get("/{project_id}/health-history", response_model=list[HealthLogResponse])
async def get_health_history(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[HealthLogResponse]:
    """Get the health log history for a project."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    logs_result = await db.execute(
        select(ProjectHealthLog)
        .where(ProjectHealthLog.project_id == project_id)
        .order_by(ProjectHealthLog.logged_at.desc())
    )
    logs = logs_result.scalars().all()

    responses = []
    for log in logs:
        resp = HealthLogResponse.model_validate(log)
        resp.logged_by_name = log.logged_by.full_name if log.logged_by else None
        responses.append(resp)
    return responses


# ---------------------------------------------------------------------------
# Financials
# ---------------------------------------------------------------------------


@router.get("/{project_id}/financials", response_model=ProjectFinancialSummary)
async def get_project_financials(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectFinancialSummary:
    """Get the financial summary for a project (budget vs actual)."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    hours_result = await db.execute(
        select(func.coalesce(func.sum(TimesheetEntry.hours), 0.0))
        .where(TimesheetEntry.project_id == project_id)
    )
    actual_hours = float(hours_result.scalar() or 0.0)

    from app.models.financial import WIPEntry
    wip_result = await db.execute(
        select(
            func.coalesce(func.sum(WIPEntry.cost_amount), 0.0),
            func.coalesce(func.sum(WIPEntry.bill_amount), 0.0),
        ).where(WIPEntry.project_id == project_id)
    )
    wip_row = wip_result.one()
    actual_cost = float(wip_row[0])
    actual_revenue = float(wip_row[1])

    hours_remaining = None
    if project.budget_hours is not None:
        hours_remaining = max(0.0, project.budget_hours - actual_hours)

    budget_remaining = None
    if project.budget_amount is not None:
        budget_remaining = max(0.0, project.budget_amount - actual_cost)

    margin_percentage = None
    if actual_revenue > 0:
        margin_percentage = round(((actual_revenue - actual_cost) / actual_revenue) * 100, 2)

    return ProjectFinancialSummary(
        project_id=project.id,
        project_name=project.name,
        budget_hours=project.budget_hours,
        budget_amount=project.budget_amount,
        actual_hours=actual_hours,
        actual_cost=round(actual_cost, 2),
        actual_revenue=round(actual_revenue, 2),
        hours_remaining=hours_remaining,
        budget_remaining=budget_remaining,
        margin_percentage=margin_percentage,
    )


# ---------------------------------------------------------------------------
# Team
# ---------------------------------------------------------------------------


@router.get("/{project_id}/team", response_model=list[ProjectTeamMember])
async def get_project_team(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ProjectTeamMember]:
    """Get allocated resources for a project."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    alloc_result = await db.execute(
        select(ResourceAllocation).where(ResourceAllocation.project_id == project_id)
    )
    allocations = alloc_result.scalars().all()

    team = []
    for alloc in allocations:
        resource = alloc.resource
        user_name = resource.user.full_name if resource and resource.user else "Unknown"
        grade = resource.grade if resource else None
        team.append(
            ProjectTeamMember(
                resource_id=alloc.resource_id,
                user_name=user_name,
                grade=grade,
                role_on_project=alloc.role_on_project,
                hours_per_week=alloc.hours_per_week,
                start_date=alloc.start_date,
                end_date=alloc.end_date,
                allocation_status=alloc.status,
            )
        )
    return team
