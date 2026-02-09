"""
Expense CRUD routes with submission / approval workflow.
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models.expense import Expense
from app.models.project import Project
from app.models.user import User
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseListResponse,
    ExpenseRejectionRequest,
    ExpenseResponse,
    ExpenseUpdate,
)

router = APIRouter()


def _expense_to_response(exp: Expense) -> ExpenseResponse:
    resp = ExpenseResponse.model_validate(exp)
    resp.user_name = exp.user.full_name if exp.user else None
    resp.project_name = exp.project.name if exp.project else None
    return resp


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------


@router.get("/", response_model=ExpenseListResponse)
async def list_expenses(
    project_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExpenseListResponse:
    """List expenses. Non-finance users see only their own."""
    query = select(Expense)

    finance_roles = {"ADMIN", "FINANCE"}
    if current_user.role not in finance_roles:
        query = query.where(Expense.user_id == current_user.id)

    if project_id is not None:
        query = query.where(Expense.project_id == project_id)
    if status_filter:
        query = query.where(Expense.status == status_filter)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Expense.expense_date.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    expenses = result.scalars().all()

    return ExpenseListResponse(
        expenses=[_expense_to_response(e) for e in expenses],
        total=total,
    )


@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    expense_in: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExpenseResponse:
    """Create a new expense."""
    proj_result = await db.execute(
        select(Project).where(Project.id == expense_in.project_id, Project.is_deleted == False)
    )
    project = proj_result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if project.status not in ("ACTIVE", "DRAFT"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create expenses for inactive projects",
        )

    expense = Expense(
        user_id=current_user.id,
        project_id=expense_in.project_id,
        description=expense_in.description,
        amount=expense_in.amount,
        currency=expense_in.currency,
        category=expense_in.category.value,
        receipt_url=expense_in.receipt_url,
        expense_date=expense_in.expense_date,
        notes=expense_in.notes,
    )
    db.add(expense)
    await db.flush()
    await db.refresh(expense)
    return _expense_to_response(expense)


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExpenseResponse:
    """Get an expense by ID."""
    result = await db.execute(select(Expense).where(Expense.id == expense_id))
    expense = result.scalar_one_or_none()
    if expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    finance_roles = {"ADMIN", "FINANCE"}
    if expense.user_id != current_user.id and current_user.role not in finance_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return _expense_to_response(expense)


@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: int,
    expense_in: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExpenseResponse:
    """Update an expense (only if DRAFT)."""
    result = await db.execute(select(Expense).where(Expense.id == expense_id))
    expense = result.scalar_one_or_none()
    if expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    if expense.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your expense")

    if expense.status != "DRAFT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only update expenses in DRAFT status",
        )

    update_data = expense_in.model_dump(exclude_unset=True)
    if "category" in update_data and update_data["category"] is not None:
        update_data["category"] = update_data["category"].value
    for field, value in update_data.items():
        setattr(expense, field, value)
    expense.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(expense)
    return _expense_to_response(expense)


# ---------------------------------------------------------------------------
# Workflow
# ---------------------------------------------------------------------------


@router.post("/{expense_id}/submit", response_model=ExpenseResponse)
async def submit_expense(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExpenseResponse:
    """Submit an expense for approval."""
    result = await db.execute(select(Expense).where(Expense.id == expense_id))
    expense = result.scalar_one_or_none()
    if expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    if expense.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your expense")

    if expense.status not in ("DRAFT", "REJECTED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit expense with status {expense.status}",
        )

    expense.status = "SUBMITTED"
    expense.submitted_at = datetime.now(timezone.utc)
    expense.rejection_notes = None
    expense.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(expense)
    return _expense_to_response(expense)


@router.post("/{expense_id}/approve", response_model=ExpenseResponse)
async def approve_expense(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(
        "ADMIN", "DELIVERY_LEAD", "PROJECT_MANAGER", "FINANCE"
    )),
) -> ExpenseResponse:
    """Approve a submitted expense."""
    result = await db.execute(select(Expense).where(Expense.id == expense_id))
    expense = result.scalar_one_or_none()
    if expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    if expense.status != "SUBMITTED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only SUBMITTED expenses can be approved",
        )

    expense.status = "APPROVED"
    expense.approved_by_id = current_user.id
    expense.approved_at = datetime.now(timezone.utc)
    expense.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(expense)
    return _expense_to_response(expense)


@router.post("/{expense_id}/reject", response_model=ExpenseResponse)
async def reject_expense(
    expense_id: int,
    body: ExpenseRejectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(
        "ADMIN", "DELIVERY_LEAD", "PROJECT_MANAGER", "FINANCE"
    )),
) -> ExpenseResponse:
    """Reject a submitted expense with notes."""
    result = await db.execute(select(Expense).where(Expense.id == expense_id))
    expense = result.scalar_one_or_none()
    if expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    if expense.status != "SUBMITTED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only SUBMITTED expenses can be rejected",
        )

    expense.status = "REJECTED"
    expense.rejection_notes = body.notes
    expense.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(expense)
    return _expense_to_response(expense)


@router.post("/{expense_id}/close", response_model=ExpenseResponse)
async def close_expense(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "FINANCE")),
) -> ExpenseResponse:
    """Close an approved expense (finance only)."""
    result = await db.execute(select(Expense).where(Expense.id == expense_id))
    expense = result.scalar_one_or_none()
    if expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    if expense.status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only APPROVED expenses can be closed",
        )

    expense.status = "CLOSED"
    expense.closed_at = datetime.now(timezone.utc)
    expense.closed_by_id = current_user.id
    expense.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(expense)
    return _expense_to_response(expense)
