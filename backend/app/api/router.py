"""
Main API router that aggregates all route modules.
"""

from fastapi import APIRouter

from app.api.routes import (
    approvals,
    auth,
    clients,
    dashboards,
    expenses,
    financial,
    opportunities,
    projects,
    resources,
    timesheets,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(clients.router, prefix="/clients", tags=["Clients"])
api_router.include_router(opportunities.router, prefix="/opportunities", tags=["Opportunities"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(resources.router, prefix="/resources", tags=["Resources"])
api_router.include_router(timesheets.router, prefix="/timesheets", tags=["Timesheets"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["Expenses"])
api_router.include_router(financial.router, prefix="/financial", tags=["Financial"])
api_router.include_router(approvals.router, prefix="/approvals", tags=["Approvals"])
api_router.include_router(dashboards.router, prefix="/dashboards", tags=["Dashboards"])
