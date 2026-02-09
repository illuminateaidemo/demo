"""
Approval schemas.

Aligned with existing ApprovalRequest ORM model.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class ApprovalRequestType(str, Enum):
    TIMESHEET = "TIMESHEET"
    EXPENSE = "EXPENSE"
    RESOURCE_ALLOCATION = "RESOURCE_ALLOCATION"
    PROJECT_CHANGE = "PROJECT_CHANGE"
    BUDGET_CHANGE = "BUDGET_CHANGE"


class ApprovalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class ApprovalResponse(BaseModel):
    id: int
    request_type: str
    entity_id: int
    entity_type: str
    requested_by_id: int
    requested_by_name: Optional[str] = None
    assigned_to_id: int
    assigned_to_name: Optional[str] = None
    status: str
    decision_notes: Optional[str] = None
    requested_at: datetime
    decided_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ApprovalListResponse(BaseModel):
    approvals: list[ApprovalResponse]
    total: int


class ApprovalDecisionRequest(BaseModel):
    notes: Optional[str] = None


class ApprovalSummary(BaseModel):
    total_pending: int
    pending_by_type: dict[str, int]
