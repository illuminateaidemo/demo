"""
Approval workflow schemas.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Any
from datetime import datetime
from enum import Enum


class ApprovalRequestType(str, Enum):
    TIMESHEET = "TIMESHEET"
    EXPENSE = "EXPENSE"
    PROJECT_CHANGE = "PROJECT_CHANGE"
    RESOURCE_ALLOCATION = "RESOURCE_ALLOCATION"
    BUDGET_CHANGE = "BUDGET_CHANGE"
    BILLING_MILESTONE = "BILLING_MILESTONE"
    WRITE_OFF = "WRITE_OFF"


class ApprovalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    ESCALATED = "ESCALATED"


# ---------------------------------------------------------------------------
# Approval Request schemas
# ---------------------------------------------------------------------------

class ApprovalRequestBase(BaseModel):
    request_type: ApprovalRequestType
    entity_id: int = Field(..., description="ID of the entity being approved (timesheet, expense, etc.)")
    entity_type: str = Field(..., description="Table/model name of the entity")
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    requested_by_id: int
    assigned_to_id: int
    priority: Optional[str] = Field(None, description="LOW, MEDIUM, HIGH")
    metadata: Optional[dict[str, Any]] = Field(
        None,
        description="Additional context data (e.g. old/new values for changes)"
    )


class ApprovalRequestCreate(ApprovalRequestBase):
    due_date: Optional[datetime] = None


class ApprovalDecision(BaseModel):
    """Payload for approving, rejecting, or escalating a request."""
    decision: ApprovalStatus = Field(
        ...,
        description="Must be APPROVED, REJECTED, or ESCALATED"
    )
    comments: Optional[str] = None
    escalate_to_id: Optional[int] = Field(
        None,
        description="User ID to escalate to (required when decision is ESCALATED)"
    )

    @field_validator("decision")
    @classmethod
    def validate_decision(cls, v: ApprovalStatus) -> ApprovalStatus:
        allowed = {ApprovalStatus.APPROVED, ApprovalStatus.REJECTED, ApprovalStatus.ESCALATED}
        if v not in allowed:
            raise ValueError(f"Decision must be one of: {[s.value for s in allowed]}")
        return v

    @field_validator("escalate_to_id")
    @classmethod
    def escalation_needs_target(cls, v: Optional[int], info) -> Optional[int]:
        decision = info.data.get("decision")
        if decision == ApprovalStatus.ESCALATED and v is None:
            raise ValueError("escalate_to_id is required when decision is ESCALATED")
        return v


class ApprovalRequestResponse(ApprovalRequestBase):
    id: int
    status: ApprovalStatus
    due_date: Optional[datetime] = None
    decided_at: Optional[datetime] = None
    decided_by_id: Optional[int] = None
    decided_by_name: Optional[str] = None
    decision_comments: Optional[str] = None
    requested_by_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ApprovalRequestListResponse(BaseModel):
    requests: list[ApprovalRequestResponse]
    total: int
    pending_count: int = 0


class ApprovalHistoryEntry(BaseModel):
    """Single entry in the audit trail for an approval."""
    id: int
    approval_request_id: int
    action: ApprovalStatus
    actor_id: int
    actor_name: Optional[str] = None
    comments: Optional[str] = None
    timestamp: datetime

    model_config = {"from_attributes": True}


class ApprovalHistoryResponse(BaseModel):
    approval_request_id: int
    entries: list[ApprovalHistoryEntry] = []
