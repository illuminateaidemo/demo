"""
ORM models for the Project Intelligence Platform.

Import all models here so that Base.metadata is fully populated
when create_tables() is called.
"""

from app.models.user import User
from app.models.client import Client, ClientContact
from app.models.opportunity import Opportunity
from app.models.project import Project, ProjectPhase, HealthLog
from app.models.resource import Resource, Allocation, ResourceDemand
from app.models.timesheet import Timesheet, TimesheetEntry
from app.models.expense import Expense
from app.models.financial import WIPEntry, BillingMilestone, PostingPeriod
from app.models.approval import Approval

__all__ = [
    "User",
    "Client",
    "ClientContact",
    "Opportunity",
    "Project",
    "ProjectPhase",
    "HealthLog",
    "Resource",
    "Allocation",
    "ResourceDemand",
    "Timesheet",
    "TimesheetEntry",
    "Expense",
    "WIPEntry",
    "BillingMilestone",
    "PostingPeriod",
    "Approval",
]
