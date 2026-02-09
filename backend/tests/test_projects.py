"""Tests for project management endpoints."""

import pytest
from httpx import AsyncClient


async def _create_client(client: AsyncClient, auth_headers: dict) -> int:
    """Helper to create a client and return its ID."""
    resp = await client.post(
        "/api/v1/clients",
        json={"name": "Project Test Client", "industry": "Tech", "status": "ACTIVE"},
        headers=auth_headers,
    )
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_create_project(client: AsyncClient, auth_headers: dict):
    """POST /api/v1/projects creates a new project."""
    client_id = await _create_client(client, auth_headers)
    response = await client.post(
        "/api/v1/projects",
        json={
            "name": "Test Project",
            "client_id": client_id,
            "status": "DRAFT",
            "project_type": "FIXED_PRICE",
            "start_date": "2026-03-01",
            "end_date": "2026-09-30",
            "budget_hours": 1000,
            "budget_amount": 250000,
            "currency": "GBP",
            "practice": "Technology",
        },
        headers=auth_headers,
    )
    assert response.status_code in (200, 201)
    data = response.json()
    assert data["name"] == "Test Project"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_projects(client: AsyncClient, auth_headers: dict):
    """GET /api/v1/projects returns a list of projects."""
    client_id = await _create_client(client, auth_headers)
    await client.post(
        "/api/v1/projects",
        json={
            "name": "List Project",
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
    response = await client.get("/api/v1/projects", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_get_project(client: AsyncClient, auth_headers: dict):
    """GET /api/v1/projects/{id} returns project detail."""
    client_id = await _create_client(client, auth_headers)
    create_resp = await client.post(
        "/api/v1/projects",
        json={
            "name": "Detail Project",
            "client_id": client_id,
            "status": "ACTIVE",
            "project_type": "FIXED_PRICE",
            "start_date": "2026-01-01",
            "end_date": "2026-06-30",
            "budget_hours": 800,
            "budget_amount": 200000,
            "currency": "USD",
        },
        headers=auth_headers,
    )
    project_id = create_resp.json()["id"]
    response = await client.get(f"/api/v1/projects/{project_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Detail Project"


@pytest.mark.asyncio
async def test_update_project(client: AsyncClient, auth_headers: dict):
    """PUT /api/v1/projects/{id} updates project fields."""
    client_id = await _create_client(client, auth_headers)
    create_resp = await client.post(
        "/api/v1/projects",
        json={
            "name": "Update Project",
            "client_id": client_id,
            "status": "DRAFT",
            "project_type": "RETAINER",
            "start_date": "2026-04-01",
            "end_date": "2026-10-31",
            "budget_hours": 600,
            "budget_amount": 150000,
            "currency": "GBP",
        },
        headers=auth_headers,
    )
    project_id = create_resp.json()["id"]
    response = await client.put(
        f"/api/v1/projects/{project_id}",
        json={"name": "Updated Project", "status": "ACTIVE"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Project"
