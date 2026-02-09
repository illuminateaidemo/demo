"""
Financial routes: WIP entries, billing milestones, posting periods, export.
"""

from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models.financial import BillingMilestone, PostingPeriod, WIPEntry
from app.models.project import Project
from app.models.timesheet import TimesheetEntry
from app.models.user import User
from app.schemas.financial import (
    BillingMilestoneCreate,
    BillingMilestoneListResponse,
    BillingMilestoneResponse,
    BillingMilestoneUpdate,
    FinancialExportResponse,
    InvoicedRequest,
    PostingPeriodCreate,
    PostingPeriodListResponse,
    PostingPeriodResponse,
    WIPEntryListResponse,
    WIPEntryResponse,
    WIPGenerateRequest,
    WIPReviewRequest,
    WIPSummaryEntry,
    WIPSummaryResponse,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _wip_to_response(wip: WIPEntry) -> WIPEntryResponse:
    resp = WIPEntryResponse.model_validate(wip)
    resp.project_name = wip.project.name if wip.project else None
    resp.period_name = wip.period.name if wip.period else None
    return resp


def _milestone_to_response(ms: BillingMilestone) -> BillingMilestoneResponse:
    resp = BillingMilestoneResponse.model_validate(ms)
    resp.project_name = ms.project.name if ms.project else None
    return resp


# ---------------------------------------------------------------------------
# WIP Entries
# ---------------------------------------------------------------------------


@router.get("/wip", response_model=WIPEntryListResponse)
async def list_wip(
    project_id: Optional[int] = Query(None),
    period_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WIPEntryListResponse:
    """List WIP entries with filters."""
    query = select(WIPEntry)

    if project_id is not None:
        query = query.where(WIPEntry.project_id == project_id)
    if period_id is not None:
        query = query.where(WIPEntry.period_id == period_id)
    if status_filter:
        query = query.where(WIPEntry.status == status_filter)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(WIPEntry.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    entries = result.scalars().all()

    return WIPEntryListResponse(
        entries=[_wip_to_response(e) for e in entries],
        total=total,
    )


@router.get("/wip/summary", response_model=WIPSummaryResponse)
async def wip_summary(
    period_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WIPSummaryResponse:
    """Get WIP summary aggregated by project."""
    query = select(WIPEntry)
    if period_id is not None:
        query = query.where(WIPEntry.period_id == period_id)

    result = await db.execute(query)
    entries = result.scalars().all()

    project_data: dict[int, dict] = {}
    for e in entries:
        pid = e.project_id
        if pid not in project_data:
            project_data[pid] = {
                "project_id": pid,
                "project_name": e.project.name if e.project else "Unknown",
                "total_hours": 0.0,
                "total_cost": 0.0,
                "total_revenue": 0.0,
            }
        project_data[pid]["total_hours"] += e.hours
        project_data[pid]["total_cost"] += e.cost
        project_data[pid]["total_revenue"] += e.revenue

    summary_entries = []
    grand_hours = 0.0
    grand_cost = 0.0
    grand_revenue = 0.0

    for data in project_data.values():
        margin = data["total_revenue"] - data["total_cost"]
        summary_entries.append(WIPSummaryEntry(**data, margin=margin))
        grand_hours += data["total_hours"]
        grand_cost += data["total_cost"]
        grand_revenue += data["total_revenue"]

    return WIPSummaryResponse(
        entries=summary_entries,
        grand_total_hours=grand_hours,
        grand_total_cost=grand_cost,
        grand_total_revenue=grand_revenue,
        grand_total_margin=grand_revenue - grand_cost,
    )


@router.post("/wip/generate", response_model=list[WIPEntryResponse])
async def generate_wip(
    body: WIPGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "FINANCE")),
) -> list[WIPEntryResponse]:
    """Generate WIP entries for a posting period from approved timesheets."""
    period_result = await db.execute(
        select(PostingPeriod).where(PostingPeriod.id == body.period_id)
    )
    period = period_result.scalar_one_or_none()
    if period is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Posting period not found")
    if period.status != "OPEN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only generate WIP for OPEN periods",
        )

    project_query = select(Project).where(Project.is_deleted == False, Project.status == "ACTIVE")
    if body.project_ids:
        project_query = project_query.where(Project.id.in_(body.project_ids))
    project_result = await db.execute(project_query)
    projects = project_result.scalars().all()

    created_entries = []
    for proj in projects:
        existing = await db.execute(
            select(WIPEntry).where(
                WIPEntry.project_id == proj.id,
                WIPEntry.period_id == period.id,
            )
        )
        if existing.scalar_one_or_none() is not None:
            continue

        hours_result = await db.execute(
            select(func.coalesce(func.sum(TimesheetEntry.hours), 0.0)).where(
                TimesheetEntry.project_id == proj.id,
                TimesheetEntry.date >= period.start_date,
                TimesheetEntry.date <= period.end_date,
            )
        )
        hours = float(hours_result.scalar() or 0.0)
        if hours == 0:
            continue

        hourly_rate = proj.hourly_rate or 0.0
        revenue = hours * hourly_rate
        cost = hours * (hourly_rate * 0.6)

        wip = WIPEntry(
            project_id=proj.id,
            period_id=period.id,
            hours=hours,
            cost=round(cost, 2),
            revenue=round(revenue, 2),
            status="DRAFT",
        )
        db.add(wip)
        await db.flush()
        await db.refresh(wip)
        created_entries.append(_wip_to_response(wip))

    return created_entries


@router.put("/wip/{wip_id}/review", response_model=WIPEntryResponse)
async def review_wip(
    wip_id: int,
    body: WIPReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "FINANCE")),
) -> WIPEntryResponse:
    """Review a WIP entry."""
    result = await db.execute(select(WIPEntry).where(WIPEntry.id == wip_id))
    wip = result.scalar_one_or_none()
    if wip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="WIP entry not found")

    if wip.status != "DRAFT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only DRAFT WIP entries can be reviewed",
        )

    wip.status = "REVIEWED"
    wip.reviewed_by_id = current_user.id
    wip.reviewed_at = datetime.now(timezone.utc)
    if body.notes is not None:
        wip.notes = body.notes
    wip.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(wip)
    return _wip_to_response(wip)


@router.post("/wip/{wip_id}/post", response_model=WIPEntryResponse)
async def post_wip(
    wip_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "FINANCE")),
) -> WIPEntryResponse:
    """Post a reviewed WIP entry."""
    result = await db.execute(select(WIPEntry).where(WIPEntry.id == wip_id))
    wip = result.scalar_one_or_none()
    if wip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="WIP entry not found")

    if wip.status != "REVIEWED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only REVIEWED WIP entries can be posted",
        )

    wip.status = "POSTED"
    wip.posted_at = datetime.now(timezone.utc)
    wip.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(wip)
    return _wip_to_response(wip)


# ---------------------------------------------------------------------------
# Billing Milestones
# ---------------------------------------------------------------------------


@router.get("/milestones", response_model=BillingMilestoneListResponse)
async def list_milestones(
    project_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BillingMilestoneListResponse:
    """List billing milestones."""
    query = select(BillingMilestone)

    if project_id is not None:
        query = query.where(BillingMilestone.project_id == project_id)
    if status_filter:
        query = query.where(BillingMilestone.status == status_filter)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(BillingMilestone.due_date).offset(skip).limit(limit)
    result = await db.execute(query)
    milestones = result.scalars().all()

    return BillingMilestoneListResponse(
        milestones=[_milestone_to_response(m) for m in milestones],
        total=total,
    )


@router.post(
    "/milestones",
    response_model=BillingMilestoneResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_milestone(
    ms_in: BillingMilestoneCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BillingMilestoneResponse:
    """Create a billing milestone."""
    proj_result = await db.execute(
        select(Project).where(Project.id == ms_in.project_id, Project.is_deleted == False)
    )
    if proj_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    milestone = BillingMilestone(
        project_id=ms_in.project_id,
        name=ms_in.name,
        description=ms_in.description,
        amount=ms_in.amount,
        currency=ms_in.currency,
        due_date=ms_in.due_date,
        notes=ms_in.notes,
    )
    db.add(milestone)
    await db.flush()
    await db.refresh(milestone)
    return _milestone_to_response(milestone)


@router.put("/milestones/{milestone_id}", response_model=BillingMilestoneResponse)
async def update_milestone(
    milestone_id: int,
    ms_in: BillingMilestoneUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BillingMilestoneResponse:
    """Update a billing milestone."""
    result = await db.execute(
        select(BillingMilestone).where(BillingMilestone.id == milestone_id)
    )
    milestone = result.scalar_one_or_none()
    if milestone is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found"
        )

    if milestone.status == "INVOICED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update an invoiced milestone",
        )

    update_data = ms_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(milestone, field, value)
    milestone.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(milestone)
    return _milestone_to_response(milestone)


@router.post("/milestones/{milestone_id}/ready", response_model=BillingMilestoneResponse)
async def mark_milestone_ready(
    milestone_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BillingMilestoneResponse:
    """Mark a milestone as ready for billing."""
    result = await db.execute(
        select(BillingMilestone).where(BillingMilestone.id == milestone_id)
    )
    milestone = result.scalar_one_or_none()
    if milestone is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found"
        )

    if milestone.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PENDING milestones can be marked as ready",
        )

    milestone.status = "READY"
    milestone.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(milestone)
    return _milestone_to_response(milestone)


@router.post("/milestones/{milestone_id}/invoiced", response_model=BillingMilestoneResponse)
async def mark_milestone_invoiced(
    milestone_id: int,
    body: InvoicedRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "FINANCE")),
) -> BillingMilestoneResponse:
    """Mark a milestone as invoiced (finance only)."""
    result = await db.execute(
        select(BillingMilestone).where(BillingMilestone.id == milestone_id)
    )
    milestone = result.scalar_one_or_none()
    if milestone is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found"
        )

    if milestone.status != "READY":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only READY milestones can be invoiced",
        )

    milestone.status = "INVOICED"
    milestone.invoice_number = body.invoice_number
    milestone.invoiced_date = body.invoiced_date or date.today()
    milestone.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(milestone)
    return _milestone_to_response(milestone)


# ---------------------------------------------------------------------------
# Posting Periods
# ---------------------------------------------------------------------------


@router.get("/periods", response_model=PostingPeriodListResponse)
async def list_periods(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PostingPeriodListResponse:
    """List posting periods."""
    count_query = select(func.count()).select_from(PostingPeriod)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    result = await db.execute(
        select(PostingPeriod)
        .order_by(PostingPeriod.start_date.desc())
        .offset(skip)
        .limit(limit)
    )
    periods = result.scalars().all()

    return PostingPeriodListResponse(periods=periods, total=total)


@router.post(
    "/periods",
    response_model=PostingPeriodResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_period(
    period_in: PostingPeriodCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "FINANCE")),
) -> PostingPeriodResponse:
    """Create a new posting period."""
    if period_in.end_date < period_in.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_date must be on or after start_date",
        )

    existing = await db.execute(
        select(PostingPeriod).where(PostingPeriod.name == period_in.name)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A posting period with this name already exists",
        )

    period = PostingPeriod(
        name=period_in.name,
        start_date=period_in.start_date,
        end_date=period_in.end_date,
    )
    db.add(period)
    await db.flush()
    await db.refresh(period)
    return period


@router.post("/periods/{period_id}/close", response_model=PostingPeriodResponse)
async def close_period(
    period_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "FINANCE")),
) -> PostingPeriodResponse:
    """Close a posting period."""
    result = await db.execute(select(PostingPeriod).where(PostingPeriod.id == period_id))
    period = result.scalar_one_or_none()
    if period is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Posting period not found"
        )

    if period.status != "OPEN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only OPEN periods can be closed",
        )

    unposted = await db.execute(
        select(func.count()).select_from(
            select(WIPEntry)
            .where(
                WIPEntry.period_id == period_id,
                WIPEntry.status != "POSTED",
            )
            .subquery()
        )
    )
    unposted_count = unposted.scalar() or 0
    if unposted_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot close period: {unposted_count} WIP entries are not yet posted",
        )

    period.status = "CLOSED"
    period.closed_by_id = current_user.id
    period.closed_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(period)
    return period


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------


@router.get("/export", response_model=FinancialExportResponse)
async def export_financial_data(
    period_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "FINANCE")),
) -> FinancialExportResponse:
    """Export financial data for ERP integration (returns JSON)."""
    wip_query = select(WIPEntry)
    if period_id is not None:
        wip_query = wip_query.where(WIPEntry.period_id == period_id)
    wip_result = await db.execute(wip_query)
    wip_entries = wip_result.scalars().all()

    ms_query = select(BillingMilestone)
    ms_result = await db.execute(ms_query)
    milestones = ms_result.scalars().all()

    period_result = await db.execute(select(PostingPeriod).order_by(PostingPeriod.start_date))
    periods = period_result.scalars().all()

    return FinancialExportResponse(
        export_date=datetime.now(timezone.utc),
        wip_entries=[_wip_to_response(w) for w in wip_entries],
        milestones=[_milestone_to_response(m) for m in milestones],
        periods=periods,
    )
