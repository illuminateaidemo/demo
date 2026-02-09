"""
FastAPI application entry point for the Project Intelligence Platform.
"""

import logging
from contextlib import asynccontextmanager
from datetime import date

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api.router import api_router
from app.core.config import get_settings
from app.core.database import async_session_factory, create_tables
from app.core.security import hash_password
from app.models import (  # noqa: F401 – ensure all models are imported for table creation
    Approval,
    Allocation,
    BillingMilestone,
    Client,
    ClientContact,
    Expense,
    HealthLog,
    Opportunity,
    PostingPeriod,
    Project,
    ProjectPhase,
    Resource,
    ResourceDemand,
    Timesheet,
    TimesheetEntry,
    User,
    WIPEntry,
)

settings = get_settings()
logger = logging.getLogger(__name__)


async def seed_demo_data() -> None:
    """Seed the database with demo data if it is empty."""
    async with async_session_factory() as session:
        try:
            result = await session.execute(select(User).limit(1))
            if result.scalar_one_or_none() is not None:
                logger.info("Database already contains data; skipping seed.")
                return

            # --- Admin user ---
            admin = User(
                email="admin@projectintel.io",
                full_name="Platform Admin",
                hashed_password=hash_password("admin1234"),
                role="ADMIN",
                office="London",
                practice="Management",
            )
            session.add(admin)
            await session.flush()

            # --- Demo consultant user ---
            consultant = User(
                email="consultant@projectintel.io",
                full_name="Jane Smith",
                hashed_password=hash_password("password1234"),
                role="CONSULTANT",
                office="London",
                practice="Technology",
            )
            session.add(consultant)
            await session.flush()

            # --- Project manager user ---
            pm = User(
                email="pm@projectintel.io",
                full_name="John Manager",
                hashed_password=hash_password("password1234"),
                role="PROJECT_MANAGER",
                office="London",
                practice="Technology",
            )
            session.add(pm)
            await session.flush()

            # --- Sample client ---
            client = Client(
                name="Acme Corporation",
                legal_entity_name="Acme Corp Ltd",
                industry="Technology",
                sector="Software",
                website="https://acme.example.com",
                city="London",
                country="United Kingdom",
                status="ACTIVE",
                account_manager_id=admin.id,
            )
            session.add(client)
            await session.flush()

            # --- Client contact ---
            contact = ClientContact(
                client_id=client.id,
                first_name="Alice",
                last_name="Johnson",
                email="alice@acme.example.com",
                phone="+44 20 1234 5678",
                job_title="CTO",
                is_primary=True,
            )
            session.add(contact)

            # --- Sample opportunity ---
            opp = Opportunity(
                title="Digital Transformation Programme",
                client_id=client.id,
                description="End-to-end digital transformation engagement",
                value=500000.0,
                currency="GBP",
                probability=75,
                expected_start_date=date(2026, 3, 1),
                expected_end_date=date(2026, 9, 30),
                status="WON",
                practice="Technology",
                owner_id=admin.id,
            )
            session.add(opp)
            await session.flush()

            # --- Sample project ---
            project = Project(
                name="Digital Transformation Programme",
                client_id=client.id,
                opportunity_id=opp.id,
                description="End-to-end digital transformation engagement",
                status="ACTIVE",
                practice="Technology",
                project_type="FIXED_PRICE",
                start_date=date(2026, 3, 1),
                end_date=date(2026, 9, 30),
                budget_hours=2000.0,
                budget_amount=500000.0,
                currency="GBP",
                hourly_rate=250.0,
                health_status="GREEN",
                manager_id=pm.id,
            )
            session.add(project)
            await session.flush()

            # --- Project phases ---
            phase1 = ProjectPhase(
                project_id=project.id,
                name="Discovery",
                description="Requirements gathering and analysis",
                start_date=date(2026, 3, 1),
                end_date=date(2026, 4, 15),
                status="IN_PROGRESS",
                budget_hours=400.0,
                budget_amount=100000.0,
                sort_order=1,
            )
            phase2 = ProjectPhase(
                project_id=project.id,
                name="Design & Build",
                description="Solution design and development",
                start_date=date(2026, 4, 16),
                end_date=date(2026, 7, 31),
                status="PLANNED",
                budget_hours=1200.0,
                budget_amount=300000.0,
                sort_order=2,
            )
            phase3 = ProjectPhase(
                project_id=project.id,
                name="Testing & Deployment",
                description="UAT, performance testing, and go-live",
                start_date=date(2026, 8, 1),
                end_date=date(2026, 9, 30),
                status="PLANNED",
                budget_hours=400.0,
                budget_amount=100000.0,
                sort_order=3,
            )
            session.add_all([phase1, phase2, phase3])
            await session.flush()

            # --- Resource profile for consultant ---
            resource = Resource(
                user_id=consultant.id,
                grade="Senior Consultant",
                hourly_cost=100.0,
                hourly_rate=250.0,
                location="London",
                skills="Python, FastAPI, React, Cloud Architecture",
                is_available=True,
                capacity_hours_per_week=40.0,
            )
            session.add(resource)
            await session.flush()

            # --- Allocation ---
            allocation = Allocation(
                resource_id=resource.id,
                project_id=project.id,
                phase_id=phase1.id,
                start_date=date(2026, 3, 1),
                end_date=date(2026, 4, 15),
                hours_per_week=40.0,
                percentage=100.0,
                status="ACTIVE",
            )
            session.add(allocation)

            # --- Billing milestones ---
            ms1 = BillingMilestone(
                project_id=project.id,
                name="Discovery Completion",
                description="Payment upon completion of discovery phase",
                amount=100000.0,
                currency="GBP",
                due_date=date(2026, 4, 15),
                status="PENDING",
            )
            ms2 = BillingMilestone(
                project_id=project.id,
                name="Design & Build Completion",
                description="Payment upon completion of design and build",
                amount=300000.0,
                currency="GBP",
                due_date=date(2026, 7, 31),
                status="PENDING",
            )
            session.add_all([ms1, ms2])

            await session.commit()
            logger.info("Demo data seeded successfully.")

        except Exception:
            await session.rollback()
            logger.exception("Failed to seed demo data.")
            raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: create tables and seed data on startup."""
    logger.info("Creating database tables...")
    await create_tables()
    logger.info("Seeding demo data...")
    await seed_demo_data()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="A comprehensive platform for managing professional services projects, "
                "resources, timesheets, expenses, and financial reporting.",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS middleware
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    """Simple health check endpoint."""
    return {"status": "healthy", "service": settings.APP_NAME}
