"""Tests for expense management endpoints."""

import pytest
from httpx import AsyncClient


async def _create_project(client: AsyncClient, auth_headers: dict) -> int:
    """Helper to create a client and project, returning the project ID."""
    client_resp = await client.post(
        "/api/v1/clients",
        json={"name": "Expense Test Client", "industry": "Finance", "status": "ACTIVE"},
        headers=auth_headers,
    )
    client_id = client_resp.json()["id"]
    project_resp = await client.post(
        "/api/v1/projects",
        json={
            "name": "Expense Test Project",
            "client_id": client_id,
            "status": "ACTIVE",
            "project_type": "TIME_AND_MATERIALS",
            "start_date": "2026-01-01",
            "end_date": "2026-12-31",
            "budget_hours": 500,
            "budget_amount": 100000,
            "currency": "GBP",
        },
        headers=auth_headers,
    )
    return project_resp.json()["id"]


@pytest.mark.asyncio
async def test_create_expense(client: AsyncClient, auth_headers: dict):
    """POST /api/v1/expenses creates a new expense."""
    project_id = await _create_project(client, auth_headers)
    response = await client.post(
        "/api/v1/expenses",
        json={
            "project_id": project_id,
            "category": "TRAVEL",
            "description": "Train ticket to client site",
            "amount": 125.50,
            "currency": "GBP",
            "date_incurred": "2026-03-15",
        },
        headers=auth_headers,
    )
    assert response.status_code in (200, 201)
    data = response.json()
    assert "id" in data
    assert data["amount"] == 125.50


@pytest.mark.asyncio
async def test_list_expenses(client: AsyncClient, auth_headers: dict):
    """GET /api/v1/expenses returns expense list."""
    response = await client.get("/api/v1/expenses", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_submit_expense(client: AsyncClient, auth_headers: dict):
    """POST /api/v1/expenses/{id}/submit submits an expense."""
    project_id = await _create_project(client, auth_headers)
    create_resp = await client.post(
        "/api/v1/expenses",
        json={
            "project_id": project_id,
            "category": "MEALS",
            "description": "Team lunch",
            "amount": 85.00,
            "currency": "GBP",
            "date_incurred": "2026-03-16",
        },
        headers=auth_headers,
    )
    expense_id = create_resp.json()["id"]
    response = await client.post(
        f"/api/v1/expenses/{expense_id}/submit",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("SUBMITTED", "submitted")
