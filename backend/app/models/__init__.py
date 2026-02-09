"""
SQLAlchemy ORM models for the Project Intelligence Platform.

Importing this package ensures all models are registered with the
declarative Base so that ``create_tables()`` discovers every table.
"""

from app.models.user import User, UserRole
from app.models.client import Client, ClientContact, ClientStatus
from app.models.opportunity import Opportunity, OpportunityStatus
from app.models.project import (
    CommercialModel,
    HealthStatus,
    PhaseStatus,
    Project,
    ProjectHealthLog,
    ProjectPhase,
    ProjectStatus,
)
from app.models.resource import (
    AllocationStatus,
    DemandStatus,
    Resource,
    ResourceAllocation,
    ResourceDemand,
)
from app.models.timesheet import (
    ActivityType,
    Timesheet,
    TimesheetEntry,
    TimesheetStatus,
)
from app.models.expense import Expense, ExpenseCategory, ExpenseStatus
from app.models.financial import (
    BillingMilestone,
    MilestoneStatus,
    PeriodStatus,
    PostingPeriod,
    WIPEntry,
    WIPStatus,
)
from app.models.approval import ApprovalRequest, ApprovalRequestType, ApprovalStatus

__all__ = [
    # User
    "User",
    "UserRole",
    # Client
    "Client",
    "ClientContact",
    "ClientStatus",
    # Opportunity
    "Opportunity",
    "OpportunityStatus",
    # Project
    "Project",
    "ProjectPhase",
    "ProjectHealthLog",
    "ProjectStatus",
    "CommercialModel",
    "HealthStatus",
    "PhaseStatus",
    # Resource
    "Resource",
    "ResourceAllocation",
    "ResourceDemand",
    "AllocationStatus",
    "DemandStatus",
    # Timesheet
    "Timesheet",
    "TimesheetEntry",
    "TimesheetStatus",
    "ActivityType",
    # Expense
    "Expense",
    "ExpenseCategory",
    "ExpenseStatus",
    # Financial
    "BillingMilestone",
    "MilestoneStatus",
    "WIPEntry",
    "WIPStatus",
    "PostingPeriod",
    "PeriodStatus",
    # Approval
    "ApprovalRequest",
    "ApprovalRequestType",
    "ApprovalStatus",
]
