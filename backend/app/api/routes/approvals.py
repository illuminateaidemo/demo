"""
Approval routes: list, decide, and summarise pending approvals.
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.approval import Approval
from app.models.user import User
from app.schemas.approval import (
    ApprovalDecisionRequest,
    ApprovalListResponse,
    ApprovalResponse,
    ApprovalSummary,
)

router = APIRouter()


def _approval_to_response(appr: Approval) -> ApprovalResponse:
    resp = ApprovalResponse.model_validate(appr)
    resp.requested_by_name = appr.requested_by.full_name if appr.requested_by else None
    resp.assigned_to_name = appr.assigned_to.full_name if appr.assigned_to else None
    return resp


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------


@router.get("/", response_model=ApprovalListResponse)
async def list_pending_approvals(
    type_filter: Optional[str] = Query(None, alias="type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApprovalListResponse:
    """List pending approvals assigned to the current user."""
    query = select(Approval).where(
        Approval.assigned_to_id == current_user.id,
        Approval.status == "PENDING",
    )

    if type_filter:
        query = query.where(Approval.type == type_filter)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Approval.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    approvals = result.scalars().all()

    return ApprovalListResponse(
        approvals=[_approval_to_response(a) for a in approvals],
        total=total,
    )


@router.get("/history", response_model=ApprovalListResponse)
async def list_decided_approvals(
    type_filter: Optional[str] = Query(None, alias="type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApprovalListResponse:
    """List decided (approved/rejected) approvals for the current user."""
    query = select(Approval).where(
        Approval.assigned_to_id == current_user.id,
        Approval.status.in_(["APPROVED", "REJECTED"]),
    )

    if type_filter:
        query = query.where(Approval.type == type_filter)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Approval.decided_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    approvals = result.scalars().all()

    return ApprovalListResponse(
        approvals=[_approval_to_response(a) for a in approvals],
        total=total,
    )


# ---------------------------------------------------------------------------
# Approve / Reject
# ---------------------------------------------------------------------------


@router.post("/{approval_id}/approve", response_model=ApprovalResponse)
async def approve_request(
    approval_id: int,
    body: Optional[ApprovalDecisionRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApprovalResponse:
    """Approve a pending approval request."""
    result = await db.execute(select(Approval).where(Approval.id == approval_id))
    appr = result.scalar_one_or_none()
    if appr is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Approval not found"
        )

    if appr.assigned_to_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This approval is not assigned to you",
        )

    if appr.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PENDING approvals can be decided",
        )

    appr.status = "APPROVED"
    appr.decided_at = datetime.now(timezone.utc)
    if body and body.notes:
        appr.notes = body.notes

    await db.flush()
    await db.refresh(appr)
    return _approval_to_response(appr)


@router.post("/{approval_id}/reject", response_model=ApprovalResponse)
async def reject_request(
    approval_id: int,
    body: ApprovalDecisionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApprovalResponse:
    """Reject a pending approval request with notes."""
    result = await db.execute(select(Approval).where(Approval.id == approval_id))
    appr = result.scalar_one_or_none()
    if appr is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Approval not found"
        )

    if appr.assigned_to_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This approval is not assigned to you",
        )

    if appr.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PENDING approvals can be decided",
        )

    appr.status = "REJECTED"
    appr.decided_at = datetime.now(timezone.utc)
    appr.notes = body.notes

    await db.flush()
    await db.refresh(appr)
    return _approval_to_response(appr)


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------


@router.get("/summary", response_model=ApprovalSummary)
async def approval_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApprovalSummary:
    """Get a count of pending approvals by type for the current user."""
    result = await db.execute(
        select(Approval.type, func.count(Approval.id))
        .where(
            Approval.assigned_to_id == current_user.id,
            Approval.status == "PENDING",
        )
        .group_by(Approval.type)
    )
    rows = result.all()

    pending_by_type: dict[str, int] = {}
    total_pending = 0
    for approval_type, count in rows:
        pending_by_type[approval_type] = count
        total_pending += count

    return ApprovalSummary(
        total_pending=total_pending,
        pending_by_type=pending_by_type,
    )
