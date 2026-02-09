"""
Resource management routes: resources, allocations, demand, capacity.
"""

from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.project import Project
from app.models.resource import Resource, ResourceAllocation, ResourceDemand
from app.models.timesheet import TimesheetEntry
from app.models.user import User
from app.schemas.resource import (
    AllocationCreate,
    AllocationResponse,
    AllocationUpdate,
    CapacityOverviewEntry,
    CapacityOverviewResponse,
    ResourceCreate,
    ResourceDemandCreate,
    ResourceDemandListResponse,
    ResourceDemandResponse,
    ResourceDemandUpdate,
    ResourceListResponse,
    ResourceResponse,
    ResourceUpdate,
    UtilisationResponse,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Helper to build a ResourceResponse with user info
# ---------------------------------------------------------------------------

def _resource_to_response(resource: Resource) -> ResourceResponse:
    resp = ResourceResponse.model_validate(resource)
    if resource.user:
        resp.user_name = resource.user.full_name
        resp.user_email = resource.user.email
    alloc_responses = []
    for alloc in resource.allocations:
        ar = AllocationResponse.model_validate(alloc)
        ar.project_name = alloc.project.name if alloc.project else None
        alloc_responses.append(ar)
    resp.allocations = alloc_responses
    return resp


# ---------------------------------------------------------------------------
# Resource CRUD
# ---------------------------------------------------------------------------


@router.get("/capacity/overview", response_model=CapacityOverviewResponse)
async def capacity_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CapacityOverviewResponse:
    """Get a capacity overview across all resources."""
    result = await db.execute(select(Resource).where(Resource.is_available == True))
    resources = result.scalars().all()

    today = date.today()
    entries: list[CapacityOverviewEntry] = []
    total_capacity = 0.0
    total_allocated = 0.0

    for res in resources:
        cap = res.capacity_hours_per_week
        total_capacity += cap

        allocated = 0.0
        for alloc in res.allocations:
            if alloc.status in ("CONFIRMED", "TENTATIVE") and alloc.start_date <= today <= alloc.end_date:
                allocated += alloc.hours_per_week
        total_allocated += allocated

        available = max(0.0, cap - allocated)
        util_pct = round((allocated / cap * 100), 1) if cap > 0 else 0.0

        user_name = res.user.full_name if res.user else "Unknown"
        entries.append(
            CapacityOverviewEntry(
                resource_id=res.id,
                user_name=user_name,
                grade=res.grade,
                capacity_hours_per_week=cap,
                allocated_hours_per_week=allocated,
                available_hours_per_week=available,
                utilisation_percentage=util_pct,
            )
        )

    total_available = max(0.0, total_capacity - total_allocated)
    avg_util = round((total_allocated / total_capacity * 100), 1) if total_capacity > 0 else 0.0

    return CapacityOverviewResponse(
        entries=entries,
        total_capacity=total_capacity,
        total_allocated=total_allocated,
        total_available=total_available,
        average_utilisation=avg_util,
    )


@router.get("/demand", response_model=ResourceDemandListResponse)
async def list_demands(
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResourceDemandListResponse:
    """List open resource demands."""
    query = select(ResourceDemand)
    if status_filter:
        query = query.where(ResourceDemand.status == status_filter)
    else:
        query = query.where(ResourceDemand.status.in_(["OPEN", "PARTIALLY_FILLED"]))

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(ResourceDemand.start_date).offset(skip).limit(limit)
    result = await db.execute(query)
    demands = result.scalars().all()

    demand_responses = []
    for d in demands:
        resp = ResourceDemandResponse.model_validate(d)
        resp.project_name = d.project.name if d.project else None
        demand_responses.append(resp)

    return ResourceDemandListResponse(demands=demand_responses, total=total)


@router.get("/", response_model=ResourceListResponse)
async def list_resources(
    available: Optional[bool] = Query(None),
    location: Optional[str] = Query(None),
    grade: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResourceListResponse:
    """List resources with optional filters."""
    query = select(Resource)

    if available is not None:
        query = query.where(Resource.is_available == available)
    if location:
        query = query.where(Resource.location.ilike(f"%{location}%"))
    if grade:
        query = query.where(Resource.grade == grade)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    resources = result.scalars().all()

    return ResourceListResponse(
        resources=[_resource_to_response(r) for r in resources],
        total=total,
    )


@router.post("/", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
async def create_resource(
    resource_in: ResourceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResourceResponse:
    """Create a new resource profile."""
    user_result = await db.execute(select(User).where(User.id == resource_in.user_id))
    if user_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    existing = await db.execute(
        select(Resource).where(Resource.user_id == resource_in.user_id)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Resource profile already exists for this user",
        )

    resource = Resource(
        user_id=resource_in.user_id,
        job_title=resource_in.job_title,
        grade=resource_in.grade,
        cost_rate=resource_in.cost_rate,
        bill_rate=resource_in.bill_rate,
        location=resource_in.location,
        skills=resource_in.skills,
        start_date=resource_in.start_date,
        end_date=resource_in.end_date,
        is_available=resource_in.is_available,
        capacity_hours_per_week=resource_in.capacity_hours_per_week,
    )
    db.add(resource)
    await db.flush()
    await db.refresh(resource)
    return _resource_to_response(resource)


@router.get("/{resource_id}", response_model=ResourceResponse)
async def get_resource(
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResourceResponse:
    """Get a resource by ID with current allocations."""
    result = await db.execute(select(Resource).where(Resource.id == resource_id))
    resource = result.scalar_one_or_none()
    if resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    return _resource_to_response(resource)


@router.put("/{resource_id}", response_model=ResourceResponse)
async def update_resource(
    resource_id: int,
    resource_in: ResourceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResourceResponse:
    """Update a resource profile."""
    result = await db.execute(select(Resource).where(Resource.id == resource_id))
    resource = result.scalar_one_or_none()
    if resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    update_data = resource_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(resource, field, value)

    await db.flush()
    await db.refresh(resource)
    return _resource_to_response(resource)


@router.get("/{resource_id}/allocations", response_model=list[AllocationResponse])
async def get_resource_allocations(
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AllocationResponse]:
    """Get all allocations for a resource."""
    result = await db.execute(select(Resource).where(Resource.id == resource_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    alloc_result = await db.execute(
        select(ResourceAllocation)
        .where(ResourceAllocation.resource_id == resource_id)
        .order_by(ResourceAllocation.start_date)
    )
    allocations = alloc_result.scalars().all()

    responses = []
    for alloc in allocations:
        resp = AllocationResponse.model_validate(alloc)
        resp.project_name = alloc.project.name if alloc.project else None
        responses.append(resp)
    return responses


@router.get("/{resource_id}/utilisation", response_model=UtilisationResponse)
async def get_resource_utilisation(
    resource_id: int,
    start_date: date = Query(..., description="Start of date range"),
    end_date: date = Query(..., description="End of date range"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UtilisationResponse:
    """Get utilisation metrics for a resource within a date range."""
    result = await db.execute(select(Resource).where(Resource.id == resource_id))
    resource = result.scalar_one_or_none()
    if resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    weeks = max(1, ((end_date - start_date).days + 6) // 7)
    capacity_hours = resource.capacity_hours_per_week * weeks

    alloc_result = await db.execute(
        select(ResourceAllocation).where(
            ResourceAllocation.resource_id == resource_id,
            ResourceAllocation.status.in_(["CONFIRMED", "TENTATIVE"]),
            ResourceAllocation.start_date <= end_date,
            ResourceAllocation.end_date >= start_date,
        )
    )
    allocations = alloc_result.scalars().all()

    allocated_hours = 0.0
    for alloc in allocations:
        overlap_start = max(alloc.start_date, start_date)
        overlap_end = min(alloc.end_date, end_date)
        overlap_weeks = max(0, ((overlap_end - overlap_start).days + 6) // 7)
        allocated_hours += alloc.hours_per_week * overlap_weeks

    hours_result = await db.execute(
        select(func.coalesce(func.sum(TimesheetEntry.hours), 0.0)).where(
            TimesheetEntry.project_id.in_(
                select(ResourceAllocation.project_id).where(
                    ResourceAllocation.resource_id == resource_id
                )
            ),
            TimesheetEntry.date >= start_date,
            TimesheetEntry.date <= end_date,
        )
    )
    logged_hours = float(hours_result.scalar() or 0.0)

    util_pct = round((allocated_hours / capacity_hours * 100), 1) if capacity_hours > 0 else 0.0
    user_name = resource.user.full_name if resource.user else "Unknown"

    return UtilisationResponse(
        resource_id=resource.id,
        user_name=user_name,
        start_date=start_date,
        end_date=end_date,
        capacity_hours=capacity_hours,
        allocated_hours=allocated_hours,
        logged_hours=logged_hours,
        utilisation_percentage=util_pct,
    )


# ---------------------------------------------------------------------------
# Allocations
# ---------------------------------------------------------------------------


@router.post("/allocations", response_model=AllocationResponse, status_code=status.HTTP_201_CREATED)
async def create_allocation(
    alloc_in: AllocationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AllocationResponse:
    """Create a resource allocation."""
    res_result = await db.execute(select(Resource).where(Resource.id == alloc_in.resource_id))
    if res_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    proj_result = await db.execute(
        select(Project).where(Project.id == alloc_in.project_id)
    )
    if proj_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if alloc_in.end_date < alloc_in.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_date must be on or after start_date",
        )

    allocation = ResourceAllocation(
        resource_id=alloc_in.resource_id,
        project_id=alloc_in.project_id,
        phase_id=alloc_in.phase_id,
        role_on_project=alloc_in.role_on_project,
        start_date=alloc_in.start_date,
        end_date=alloc_in.end_date,
        hours_per_week=alloc_in.hours_per_week,
        status=alloc_in.status.value,
        requested_by_id=current_user.id,
    )
    db.add(allocation)
    await db.flush()
    await db.refresh(allocation)

    resp = AllocationResponse.model_validate(allocation)
    resp.project_name = allocation.project.name if allocation.project else None
    return resp


@router.put("/allocations/{allocation_id}", response_model=AllocationResponse)
async def update_allocation(
    allocation_id: int,
    alloc_in: AllocationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AllocationResponse:
    """Update a resource allocation."""
    result = await db.execute(
        select(ResourceAllocation).where(ResourceAllocation.id == allocation_id)
    )
    allocation = result.scalar_one_or_none()
    if allocation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allocation not found")

    update_data = alloc_in.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] is not None:
        update_data["status"] = update_data["status"].value
    for field, value in update_data.items():
        setattr(allocation, field, value)

    await db.flush()
    await db.refresh(allocation)

    resp = AllocationResponse.model_validate(allocation)
    resp.project_name = allocation.project.name if allocation.project else None
    return resp


@router.post("/allocations/{allocation_id}/confirm", response_model=AllocationResponse)
async def confirm_allocation(
    allocation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AllocationResponse:
    """Confirm a requested allocation (set status to CONFIRMED)."""
    result = await db.execute(
        select(ResourceAllocation).where(ResourceAllocation.id == allocation_id)
    )
    allocation = result.scalar_one_or_none()
    if allocation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allocation not found")

    if allocation.status not in ("REQUESTED", "TENTATIVE"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only REQUESTED or TENTATIVE allocations can be confirmed",
        )

    allocation.status = "CONFIRMED"
    allocation.approved_by_id = current_user.id
    await db.flush()
    await db.refresh(allocation)

    resp = AllocationResponse.model_validate(allocation)
    resp.project_name = allocation.project.name if allocation.project else None
    return resp


# ---------------------------------------------------------------------------
# Resource Demand
# ---------------------------------------------------------------------------


@router.post("/demand", response_model=ResourceDemandResponse, status_code=status.HTTP_201_CREATED)
async def create_demand(
    demand_in: ResourceDemandCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResourceDemandResponse:
    """Create a resource demand entry."""
    proj_result = await db.execute(
        select(Project).where(Project.id == demand_in.project_id)
    )
    if proj_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    demand = ResourceDemand(
        project_id=demand_in.project_id,
        role_required=demand_in.role_required,
        grade_required=demand_in.grade_required,
        skills_required=demand_in.skills_required,
        start_date=demand_in.start_date,
        end_date=demand_in.end_date,
        hours_per_week=demand_in.hours_per_week,
        status=demand_in.status.value,
    )
    db.add(demand)
    await db.flush()
    await db.refresh(demand)

    resp = ResourceDemandResponse.model_validate(demand)
    resp.project_name = demand.project.name if demand.project else None
    return resp


@router.put("/demand/{demand_id}", response_model=ResourceDemandResponse)
async def update_demand(
    demand_id: int,
    demand_in: ResourceDemandUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResourceDemandResponse:
    """Update a resource demand entry."""
    result = await db.execute(select(ResourceDemand).where(ResourceDemand.id == demand_id))
    demand = result.scalar_one_or_none()
    if demand is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demand not found")

    update_data = demand_in.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] is not None:
        update_data["status"] = update_data["status"].value
    for field, value in update_data.items():
        setattr(demand, field, value)

    await db.flush()
    await db.refresh(demand)

    resp = ResourceDemandResponse.model_validate(demand)
    resp.project_name = demand.project.name if demand.project else None
    return resp
