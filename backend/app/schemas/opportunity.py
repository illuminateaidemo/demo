"""
Opportunity / sales pipeline schemas.

Aligned with existing Opportunity ORM model.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date, datetime
from enum import Enum


class OpportunityStatus(str, Enum):
    IDENTIFIED = "IDENTIFIED"
    QUALIFYING = "QUALIFYING"
    PROPOSAL = "PROPOSAL"
    NEGOTIATION = "NEGOTIATION"
    WON = "WON"
    LOST = "LOST"


class OpportunityBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    client_id: int
    description: Optional[str] = None
    value: Optional[float] = Field(None, ge=0, description="Estimated value")
    probability: Optional[int] = Field(None, ge=0, le=100)
    expected_start: Optional[date] = None
    expected_end: Optional[date] = None
    status: OpportunityStatus = OpportunityStatus.IDENTIFIED
    practice: Optional[str] = None
    owner_id: Optional[int] = None

    @field_validator("expected_end")
    @classmethod
    def end_date_after_start(cls, v: Optional[date], info) -> Optional[date]:
        start = info.data.get("expected_start")
        if v is not None and start is not None and v < start:
            raise ValueError("expected_end must be on or after expected_start")
        return v


class OpportunityCreate(OpportunityBase):
    pass


class OpportunityUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    client_id: Optional[int] = None
    description: Optional[str] = None
    value: Optional[float] = Field(None, ge=0)
    probability: Optional[int] = Field(None, ge=0, le=100)
    expected_start: Optional[date] = None
    expected_end: Optional[date] = None
    status: Optional[OpportunityStatus] = None
    practice: Optional[str] = None
    owner_id: Optional[int] = None


class OpportunityResponse(OpportunityBase):
    id: int
    created_at: datetime
    updated_at: datetime
    client_name: Optional[str] = None
    owner_name: Optional[str] = None

    model_config = {"from_attributes": True}


class OpportunityListResponse(BaseModel):
    opportunities: list[OpportunityResponse]
    total: int


class OpportunityPipelineSummary(BaseModel):
    """Aggregated pipeline view for dashboards."""
    total_value: float = 0.0
    weighted_value: float = 0.0
    count_by_status: dict[str, int] = {}
    value_by_status: dict[str, float] = {}
    value_by_practice: dict[str, float] = {}
