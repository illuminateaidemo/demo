"""
Pydantic schemas for the Project Intelligence Platform.

All request/response models are re-exported here for convenient imports:
    from app.schemas import UserCreate, UserResponse, ProjectCreate, ...
"""

# -- User & Auth --
from app.schemas.user import (
    UserRole,
    UserBase,
    UserCreate,
    UserUpdate,
    UserResponse,
    UserListResponse,
    Token,
    TokenPayload,
    PasswordChange,
)

# -- Client --
from app.schemas.client import (
    ClientStatus,
    ClientBase,
    ClientCreate,
    ClientUpdate,
    ClientResponse,
    ClientListResponse,
    ClientContactBase,
    ClientContactCreate,
    ClientContactUpdate,
    ClientContactResponse,
)

# -- Opportunity --
from app.schemas.opportunity import (
    OpportunityStatus,
    OpportunityBase,
    OpportunityCreate,
    OpportunityUpdate,
    OpportunityResponse,
    OpportunityListResponse,
    OpportunityPipelineSummary,
)

# -- Project --
from app.schemas.project import (
    ProjectStatus,
    CommercialModel,
    HealthStatus,
    ProjectBase,
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
    ProjectSummary,
    ProjectPhaseCreate,
    ProjectPhaseUpdate,
    ProjectPhaseResponse,
    ProjectHealthLogCreate,
    ProjectHealthLogResponse,
)

# -- Resource --
from app.schemas.resource import (
    ResourceAllocationStatus,
    DemandStatus,
    DemandPriority,
    ResourceBase,
    ResourceCreate,
    ResourceUpdate,
    ResourceResponse,
    ResourceListResponse,
    ResourceAllocationCreate,
    ResourceAllocationUpdate,
    ResourceAllocationResponse,
    ResourceAllocationListResponse,
    ResourceDemandCreate,
    ResourceDemandUpdate,
    ResourceDemandResponse,
    ResourceDemandListResponse,
)

# -- Timesheet --
from app.schemas.timesheet import (
    TimesheetStatus,
    ActivityType,
    TimesheetCreate,
    TimesheetUpdate,
    TimesheetResponse,
    TimesheetWeekResponse,
    TimesheetListResponse,
    TimesheetSubmit,
    TimesheetApproval,
    TimesheetEntryCreate,
    TimesheetEntryUpdate,
    TimesheetEntryResponse,
)

# -- Expense --
from app.schemas.expense import (
    ExpenseCategory,
    ExpenseStatus,
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
    ExpenseListResponse,
    ExpenseApproval,
)

# -- Financial --
from app.schemas.financial import (
    BillingMilestoneStatus,
    WIPStatus,
    PeriodStatus,
    BillingMilestoneCreate,
    BillingMilestoneUpdate,
    BillingMilestoneResponse,
    BillingMilestoneListResponse,
    WIPEntryResponse,
    WIPSummary,
    WIPEntryListResponse,
    PostingPeriodCreate,
    PostingPeriodUpdate,
    PostingPeriodResponse,
    PostingPeriodListResponse,
    RevenueRecognitionEntry,
    RevenueRecognitionReport,
)

# -- Approval --
from app.schemas.approval import (
    ApprovalRequestType,
    ApprovalStatus,
    ApprovalRequestCreate,
    ApprovalDecision,
    ApprovalRequestResponse,
    ApprovalRequestListResponse,
    ApprovalHistoryEntry,
    ApprovalHistoryResponse,
)

# -- Dashboard --
from app.schemas.dashboard import (
    UtilisationSummary,
    ProjectHealthSummary,
    FinancialSummary,
    ResourceCapacitySummary,
    PipelineSummary,
    LeadershipDashboard,
    DeliveryDashboard,
    FinanceDashboard,
    ResourceDashboard,
    DashboardFilters,
)

__all__ = [
    # User & Auth
    "UserRole",
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserListResponse",
    "Token",
    "TokenPayload",
    "PasswordChange",
    # Client
    "ClientStatus",
    "ClientBase",
    "ClientCreate",
    "ClientUpdate",
    "ClientResponse",
    "ClientListResponse",
    "ClientContactBase",
    "ClientContactCreate",
    "ClientContactUpdate",
    "ClientContactResponse",
    # Opportunity
    "OpportunityStatus",
    "OpportunityBase",
    "OpportunityCreate",
    "OpportunityUpdate",
    "OpportunityResponse",
    "OpportunityListResponse",
    "OpportunityPipelineSummary",
    # Project
    "ProjectStatus",
    "CommercialModel",
    "HealthStatus",
    "ProjectBase",
    "ProjectCreate",
    "ProjectUpdate",
    "ProjectResponse",
    "ProjectListResponse",
    "ProjectSummary",
    "ProjectPhaseCreate",
    "ProjectPhaseUpdate",
    "ProjectPhaseResponse",
    "ProjectHealthLogCreate",
    "ProjectHealthLogResponse",
    # Resource
    "ResourceAllocationStatus",
    "DemandStatus",
    "DemandPriority",
    "ResourceBase",
    "ResourceCreate",
    "ResourceUpdate",
    "ResourceResponse",
    "ResourceListResponse",
    "ResourceAllocationCreate",
    "ResourceAllocationUpdate",
    "ResourceAllocationResponse",
    "ResourceAllocationListResponse",
    "ResourceDemandCreate",
    "ResourceDemandUpdate",
    "ResourceDemandResponse",
    "ResourceDemandListResponse",
    # Timesheet
    "TimesheetStatus",
    "ActivityType",
    "TimesheetCreate",
    "TimesheetUpdate",
    "TimesheetResponse",
    "TimesheetWeekResponse",
    "TimesheetListResponse",
    "TimesheetSubmit",
    "TimesheetApproval",
    "TimesheetEntryCreate",
    "TimesheetEntryUpdate",
    "TimesheetEntryResponse",
    # Expense
    "ExpenseCategory",
    "ExpenseStatus",
    "ExpenseCreate",
    "ExpenseUpdate",
    "ExpenseResponse",
    "ExpenseListResponse",
    "ExpenseApproval",
    # Financial
    "BillingMilestoneStatus",
    "WIPStatus",
    "PeriodStatus",
    "BillingMilestoneCreate",
    "BillingMilestoneUpdate",
    "BillingMilestoneResponse",
    "BillingMilestoneListResponse",
    "WIPEntryResponse",
    "WIPSummary",
    "WIPEntryListResponse",
    "PostingPeriodCreate",
    "PostingPeriodUpdate",
    "PostingPeriodResponse",
    "PostingPeriodListResponse",
    "RevenueRecognitionEntry",
    "RevenueRecognitionReport",
    # Approval
    "ApprovalRequestType",
    "ApprovalStatus",
    "ApprovalRequestCreate",
    "ApprovalDecision",
    "ApprovalRequestResponse",
    "ApprovalRequestListResponse",
    "ApprovalHistoryEntry",
    "ApprovalHistoryResponse",
    # Dashboard
    "UtilisationSummary",
    "ProjectHealthSummary",
    "FinancialSummary",
    "ResourceCapacitySummary",
    "PipelineSummary",
    "LeadershipDashboard",
    "DeliveryDashboard",
    "FinanceDashboard",
    "ResourceDashboard",
    "DashboardFilters",
]
