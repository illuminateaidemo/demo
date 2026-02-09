"""
Timesheet and timesheet-entry routes with submission / approval workflow.
"""

from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models.project import Project
from app.models.timesheet import Timesheet, TimesheetEntry
from app.models.user import User
from app.schemas.timesheet import (
    RejectionRequest,
    TimesheetCreate,
    TimesheetEntryCreate,
    TimesheetEntryResponse,
    TimesheetEntryUpdate,
    TimesheetListResponse,
    TimesheetResponse,
    TimesheetUpdate,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _monday_of(d: date) -> date:
    """Return the Monday of the week containing date *d*."""
    return d - timedelta(days=d.weekday())


def _build_timesheet_response(ts: Timesheet) -> TimesheetResponse:
    """Build a TimesheetResponse from a Timesheet ORM object."""
    entry_responses = []
    for e in ts.entries:
        er = TimesheetEntryResponse.model_validate(e)
        er.project_name = e.project.name if e.project else None
        entry_responses.append(er)

    resp = TimesheetResponse.model_validate(ts)
    resp.user_name = ts.user.full_name if ts.user else None
    resp.entries = entry_responses
    return resp


def _assert_modifiable(ts: Timesheet) -> None:
    """Raise 400 if the timesheet cannot be modified."""
    if ts.status in ("SUBMITTED", "APPROVED", "LOCKED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot modify a timesheet with status {ts.status}",
        )


def _validate_entry_date(entry_date: date, week_start: date) -> None:
    """Ensure the entry date falls within the timesheet week."""
    week_end = week_start + timedelta(days=6)
    if not (week_start <= entry_date <= week_end):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Entry date {entry_date} is not within timesheet week "
                   f"{week_start} to {week_end}",
        )


async def _recalculate_total(ts: Timesheet, db: AsyncSession) -> None:
    """Recalculate and set total_hours from entries."""
    result = await db.execute(
        select(func.coalesce(func.sum(TimesheetEntry.hours), 0.0)).where(
            TimesheetEntry.timesheet_id == ts.id
        )
    )
    ts.total_hours = float(result.scalar() or 0.0)


# ---------------------------------------------------------------------------
# Timesheet CRUD
# ---------------------------------------------------------------------------


@router.get("/", response_model=TimesheetListResponse)
async def list_timesheets(
    user_id: Optional[int] = Query(None, description="Filter by user (managers only)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TimesheetListResponse:
    """List timesheets. Non-managers see only their own."""
    manager_roles = {"ADMIN", "DELIVERY_LEAD", "PROJECT_MANAGER", "RESOURCE_MANAGER"}
    query = select(Timesheet)

    if current_user.role in manager_roles and user_id is not None:
        query = query.where(Timesheet.user_id == user_id)
    elif current_user.role not in manager_roles:
        query = query.where(Timesheet.user_id == current_user.id)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Timesheet.week_start_date.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    timesheets = result.scalars().all()

    return TimesheetListResponse(
        timesheets=[_build_timesheet_response(ts) for ts in timesheets],
        total=total,
    )


@router.get("/week/{week_date}", response_model=TimesheetResponse)
async def get_or_create_timesheet_for_week(
    week_date: date,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TimesheetResponse:
    """Get or create a timesheet for the week containing the given date."""
    monday = _monday_of(week_date)

    result = await db.execute(
        select(Timesheet).where(
            Timesheet.user_id == current_user.id,
            Timesheet.week_start_date == monday,
        )
    )
    ts = result.scalar_one_or_none()

    if ts is None:
        ts = Timesheet(user_id=current_user.id, week_start_date=monday)
        db.add(ts)
        await db.flush()
        await db.refresh(ts)

    return _build_timesheet_response(ts)


@router.post("/", response_model=TimesheetResponse, status_code=status.HTTP_201_CREATED)
async def create_timesheet(
    ts_in: TimesheetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TimesheetResponse:
    """Create a new timesheet."""
    existing = await db.execute(
        select(Timesheet).where(
            Timesheet.user_id == current_user.id,
            Timesheet.week_start_date == ts_in.week_start_date,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Timesheet already exists for this week",
        )

    ts = Timesheet(user_id=current_user.id, week_start_date=ts_in.week_start_date)
    db.add(ts)
    await db.flush()
    await db.refresh(ts)
    return _build_timesheet_response(ts)


@router.put("/{timesheet_id}", response_model=TimesheetResponse)
async def update_timesheet(
    timesheet_id: int,
    ts_in: TimesheetUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TimesheetResponse:
    """Update a timesheet (metadata only; use entries endpoints for time data)."""
    result = await db.execute(select(Timesheet).where(Timesheet.id == timesheet_id))
    ts = result.scalar_one_or_none()
    if ts is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Timesheet not found")
    if ts.user_id != current_user.id and current_user.role not in ("ADMIN",):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your timesheet")

    _assert_modifiable(ts)

    update_data = ts_in.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] is not None:
        update_data["status"] = update_data["status"].value
    for field, value in update_data.items():
        setattr(ts, field, value)
    ts.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(ts)
    return _build_timesheet_response(ts)


# ---------------------------------------------------------------------------
# Timesheet Entries
# ---------------------------------------------------------------------------


@router.post(
    "/{timesheet_id}/entries",
    response_model=TimesheetEntryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_entry(
    timesheet_id: int,
    entry_in: TimesheetEntryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TimesheetEntryResponse:
    """Add a time entry to a timesheet."""
    result = await db.execute(select(Timesheet).where(Timesheet.id == timesheet_id))
    ts = result.scalar_one_or_none()
    if ts is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Timesheet not found")
    if ts.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your timesheet")

    _assert_modifiable(ts)
    _validate_entry_date(entry_in.date, ts.week_start_date)

    project_result = await db.execute(
        select(Project).where(Project.id == entry_in.project_id, Project.is_deleted == False)
    )
    project = project_result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if project.status not in ("ACTIVE", "DRAFT"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot log time against a project that is not active",
        )

    entry = TimesheetEntry(
        timesheet_id=timesheet_id,
        project_id=entry_in.project_id,
        phase_id=entry_in.phase_id,
        date=entry_in.date,
        hours=entry_in.hours,
        description=entry_in.description,
        billable=entry_in.billable,
    )
    db.add(entry)
    await db.flush()

    await _recalculate_total(ts, db)
    await db.flush()
    await db.refresh(entry)

    resp = TimesheetEntryResponse.model_validate(entry)
    resp.project_name = entry.project.name if entry.project else None
    return resp


@router.put(
    "/{timesheet_id}/entries/{entry_id}",
    response_model=TimesheetEntryResponse,
)
async def update_entry(
    timesheet_id: int,
    entry_id: int,
    entry_in: TimesheetEntryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TimesheetEntryResponse:
    """Update a time entry."""
    result = await db.execute(
        select(TimesheetEntry).where(
            TimesheetEntry.id == entry_id,
            TimesheetEntry.timesheet_id == timesheet_id,
        )
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    ts_result = await db.execute(select(Timesheet).where(Timesheet.id == timesheet_id))
    ts = ts_result.scalar_one_or_none()
    if ts is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Timesheet not found")
    if ts.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your timesheet")

    _assert_modifiable(ts)

    update_data = entry_in.model_dump(exclude_unset=True)
    if "date" in update_data and update_data["date"] is not None:
        _validate_entry_date(update_data["date"], ts.week_start_date)
    for field, value in update_data.items():
        setattr(entry, field, value)
    entry.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await _recalculate_total(ts, db)
    await db.flush()
    await db.refresh(entry)

    resp = TimesheetEntryResponse.model_validate(entry)
    resp.project_name = entry.project.name if entry.project else None
    return resp


@router.delete(
    "/{timesheet_id}/entries/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_entry(
    timesheet_id: int,
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a time entry."""
    result = await db.execute(
        select(TimesheetEntry).where(
            TimesheetEntry.id == entry_id,
            TimesheetEntry.timesheet_id == timesheet_id,
        )
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    ts_result = await db.execute(select(Timesheet).where(Timesheet.id == timesheet_id))
    ts = ts_result.scalar_one_or_none()
    if ts is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Timesheet not found")
    if ts.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your timesheet")

    _assert_modifiable(ts)

    await db.delete(entry)
    await db.flush()
    await _recalculate_total(ts, db)
    await db.flush()


# ---------------------------------------------------------------------------
# Workflow: Submit / Approve / Reject / Lock
# ---------------------------------------------------------------------------


@router.post("/{timesheet_id}/submit", response_model=TimesheetResponse)
async def submit_timesheet(
    timesheet_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TimesheetResponse:
    """Submit a timesheet for approval."""
    result = await db.execute(select(Timesheet).where(Timesheet.id == timesheet_id))
    ts = result.scalar_one_or_none()
    if ts is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Timesheet not found")
    if ts.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your timesheet")

    if ts.status not in ("DRAFT", "REJECTED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit a timesheet with status {ts.status}",
        )

    ts.status = "SUBMITTED"
    ts.submitted_at = datetime.now(timezone.utc)
    ts.rejection_notes = None
    ts.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(ts)
    return _build_timesheet_response(ts)


@router.post("/{timesheet_id}/approve", response_model=TimesheetResponse)
async def approve_timesheet(
    timesheet_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(
        "ADMIN", "DELIVERY_LEAD", "PROJECT_MANAGER", "RESOURCE_MANAGER"
    )),
) -> TimesheetResponse:
    """Approve a submitted timesheet (managers only)."""
    result = await db.execute(select(Timesheet).where(Timesheet.id == timesheet_id))
    ts = result.scalar_one_or_none()
    if ts is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Timesheet not found")

    if ts.status != "SUBMITTED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only SUBMITTED timesheets can be approved",
        )

    ts.status = "APPROVED"
    ts.approved_by_id = current_user.id
    ts.approved_at = datetime.now(timezone.utc)
    ts.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(ts)
    return _build_timesheet_response(ts)


@router.post("/{timesheet_id}/reject", response_model=TimesheetResponse)
async def reject_timesheet(
    timesheet_id: int,
    body: RejectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(
        "ADMIN", "DELIVERY_LEAD", "PROJECT_MANAGER", "RESOURCE_MANAGER"
    )),
) -> TimesheetResponse:
    """Reject a submitted timesheet with notes."""
    result = await db.execute(select(Timesheet).where(Timesheet.id == timesheet_id))
    ts = result.scalar_one_or_none()
    if ts is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Timesheet not found")

    if ts.status != "SUBMITTED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only SUBMITTED timesheets can be rejected",
        )

    ts.status = "REJECTED"
    ts.rejection_notes = body.notes
    ts.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(ts)
    return _build_timesheet_response(ts)


@router.post("/{timesheet_id}/lock", response_model=TimesheetResponse)
async def lock_timesheet(
    timesheet_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "FINANCE")),
) -> TimesheetResponse:
    """Lock an approved timesheet (finance only)."""
    result = await db.execute(select(Timesheet).where(Timesheet.id == timesheet_id))
    ts = result.scalar_one_or_none()
    if ts is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Timesheet not found")

    if ts.status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only APPROVED timesheets can be locked",
        )

    ts.status = "LOCKED"
    ts.locked_at = datetime.now(timezone.utc)
    ts.locked_by_id = current_user.id
    ts.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(ts)
    return _build_timesheet_response(ts)
