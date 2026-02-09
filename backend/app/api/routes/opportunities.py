"""
Opportunity / sales-pipeline CRUD routes.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.client import Client
from app.models.opportunity import Opportunity
from app.models.project import Project
from app.models.user import User
from app.schemas.opportunity import (
    OpportunityCreate,
    OpportunityListResponse,
    OpportunityPipelineSummary,
    OpportunityResponse,
    OpportunityUpdate,
)

router = APIRouter()


@router.get("/pipeline/summary", response_model=OpportunityPipelineSummary)
async def pipeline_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OpportunityPipelineSummary:
    """Get pipeline summary grouped by status with total and weighted values."""
    result = await db.execute(select(Opportunity))
    opportunities = result.scalars().all()

    total_value = 0.0
    weighted_value = 0.0
    count_by_status: dict[str, int] = {}
    value_by_status: dict[str, float] = {}
    value_by_practice: dict[str, float] = {}

    for opp in opportunities:
        val = opp.value or 0.0
        prob = opp.probability or 0
        total_value += val
        weighted_value += val * (prob / 100.0)

        count_by_status[opp.status] = count_by_status.get(opp.status, 0) + 1
        value_by_status[opp.status] = value_by_status.get(opp.status, 0.0) + val

        if opp.practice:
            value_by_practice[opp.practice] = (
                value_by_practice.get(opp.practice, 0.0) + val
            )

    return OpportunityPipelineSummary(
        total_value=total_value,
        weighted_value=weighted_value,
        count_by_status=count_by_status,
        value_by_status=value_by_status,
        value_by_practice=value_by_practice,
    )


@router.get("/", response_model=OpportunityListResponse)
async def list_opportunities(
    status_filter: Optional[str] = Query(None, alias="status"),
    client_id: Optional[int] = Query(None),
    owner_id: Optional[int] = Query(None),
    practice: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OpportunityListResponse:
    """List opportunities with optional filters."""
    query = select(Opportunity)

    if status_filter:
        query = query.where(Opportunity.status == status_filter)
    if client_id is not None:
        query = query.where(Opportunity.client_id == client_id)
    if owner_id is not None:
        query = query.where(Opportunity.owner_id == owner_id)
    if practice:
        query = query.where(Opportunity.practice == practice)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Opportunity.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    opportunities = result.scalars().all()

    opp_responses = []
    for opp in opportunities:
        resp = OpportunityResponse.model_validate(opp)
        resp.client_name = opp.client.name if opp.client else None
        resp.owner_name = opp.owner.full_name if opp.owner else None
        opp_responses.append(resp)

    return OpportunityListResponse(opportunities=opp_responses, total=total)


@router.post("/", response_model=OpportunityResponse, status_code=status.HTTP_201_CREATED)
async def create_opportunity(
    opp_in: OpportunityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OpportunityResponse:
    """Create a new opportunity."""
    client_result = await db.execute(select(Client).where(Client.id == opp_in.client_id))
    if client_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    opp = Opportunity(
        name=opp_in.name,
        client_id=opp_in.client_id,
        description=opp_in.description,
        value=opp_in.value,
        probability=opp_in.probability,
        expected_start=opp_in.expected_start,
        expected_end=opp_in.expected_end,
        status=opp_in.status.value,
        practice=opp_in.practice,
        owner_id=opp_in.owner_id or current_user.id,
    )
    db.add(opp)
    await db.flush()
    await db.refresh(opp)

    resp = OpportunityResponse.model_validate(opp)
    resp.client_name = opp.client.name if opp.client else None
    resp.owner_name = opp.owner.full_name if opp.owner else None
    return resp


@router.get("/{opportunity_id}", response_model=OpportunityResponse)
async def get_opportunity(
    opportunity_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OpportunityResponse:
    """Get a single opportunity by ID."""
    result = await db.execute(
        select(Opportunity).where(Opportunity.id == opportunity_id)
    )
    opp = result.scalar_one_or_none()
    if opp is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found"
        )

    resp = OpportunityResponse.model_validate(opp)
    resp.client_name = opp.client.name if opp.client else None
    resp.owner_name = opp.owner.full_name if opp.owner else None
    return resp


@router.put("/{opportunity_id}", response_model=OpportunityResponse)
async def update_opportunity(
    opportunity_id: int,
    opp_in: OpportunityUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OpportunityResponse:
    """Update an existing opportunity."""
    result = await db.execute(
        select(Opportunity).where(Opportunity.id == opportunity_id)
    )
    opp = result.scalar_one_or_none()
    if opp is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found"
        )

    update_data = opp_in.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] is not None:
        update_data["status"] = update_data["status"].value
    for field, value in update_data.items():
        setattr(opp, field, value)

    await db.flush()
    await db.refresh(opp)

    resp = OpportunityResponse.model_validate(opp)
    resp.client_name = opp.client.name if opp.client else None
    resp.owner_name = opp.owner.full_name if opp.owner else None
    return resp


@router.post("/{opportunity_id}/convert", response_model=dict)
async def convert_opportunity(
    opportunity_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Convert a WON opportunity into a draft project."""
    result = await db.execute(
        select(Opportunity).where(Opportunity.id == opportunity_id)
    )
    opp = result.scalar_one_or_none()
    if opp is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found"
        )

    if opp.status != "WON":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only WON opportunities can be converted to projects",
        )

    existing = await db.execute(
        select(Project).where(Project.opportunity_id == opportunity_id)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A project already exists for this opportunity",
        )

    project = Project(
        name=opp.name,
        code=f"PRJ-{opp.id:04d}",
        client_id=opp.client_id,
        opportunity_id=opp.id,
        description=opp.description,
        status="DRAFT",
        practice=opp.practice,
        start_date=opp.expected_start,
        end_date=opp.expected_end,
        budget_amount=opp.value,
        project_manager_id=current_user.id,
    )
    db.add(project)
    await db.flush()
    await db.refresh(project)

    return {"message": "Opportunity converted to project", "project_id": project.id}
