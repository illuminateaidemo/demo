"""
Opportunity / sales pipeline schemas.
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
    ON_HOLD = "ON_HOLD"


class OpportunityBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    client_id: int
    description: Optional[str] = None
    value: float = Field(..., ge=0, description="Estimated value of the opportunity")
    currency: str = Field(default="GBP", max_length=3)
    probability: int = Field(..., ge=0, le=100, description="Win probability percentage")
    expected_start_date: Optional[date] = None
    expected_end_date: Optional[date] = None
    status: OpportunityStatus = OpportunityStatus.IDENTIFIED
    practice: Optional[str] = None
    owner_id: Optional[int] = None
    source: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("expected_end_date")
    @classmethod
    def end_date_after_start(cls, v: Optional[date], info) -> Optional[date]:
        start = info.data.get("expected_start_date")
        if v is not None and start is not None and v < start:
            raise ValueError("expected_end_date must be on or after expected_start_date")
        return v


class OpportunityCreate(OpportunityBase):
    pass


class OpportunityUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    client_id: Optional[int] = None
    description: Optional[str] = None
    value: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    probability: Optional[int] = Field(None, ge=0, le=100)
    expected_start_date: Optional[date] = None
    expected_end_date: Optional[date] = None
    status: Optional[OpportunityStatus] = None
    practice: Optional[str] = None
    owner_id: Optional[int] = None
    source: Optional[str] = None
    notes: Optional[str] = None


class OpportunityResponse(OpportunityBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
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
