"""Tests for client management endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_client(client: AsyncClient, auth_headers: dict):
    """POST /api/v1/clients creates a new client."""
    response = await client.post(
        "/api/v1/clients",
        json={
            "name": "Test Corp",
            "industry": "Technology",
            "status": "ACTIVE",
            "website": "https://testcorp.example.com",
        },
        headers=auth_headers,
    )
    assert response.status_code in (200, 201)
    data = response.json()
    assert data["name"] == "Test Corp"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_clients(client: AsyncClient, auth_headers: dict):
    """GET /api/v1/clients returns a list of clients."""
    # Create a client first
    await client.post(
        "/api/v1/clients",
        json={"name": "List Corp", "industry": "Finance", "status": "ACTIVE"},
        headers=auth_headers,
    )
    response = await client.get("/api/v1/clients", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_get_client(client: AsyncClient, auth_headers: dict):
    """GET /api/v1/clients/{id} returns a single client."""
    create_resp = await client.post(
        "/api/v1/clients",
        json={"name": "Detail Corp", "industry": "Healthcare", "status": "ACTIVE"},
        headers=auth_headers,
    )
    client_id = create_resp.json()["id"]
    response = await client.get(f"/api/v1/clients/{client_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Detail Corp"


@pytest.mark.asyncio
async def test_update_client(client: AsyncClient, auth_headers: dict):
    """PUT /api/v1/clients/{id} updates a client."""
    create_resp = await client.post(
        "/api/v1/clients",
        json={"name": "Update Corp", "industry": "Retail", "status": "ACTIVE"},
        headers=auth_headers,
    )
    client_id = create_resp.json()["id"]
    response = await client.put(
        f"/api/v1/clients/{client_id}",
        json={"name": "Updated Corp"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Corp"


@pytest.mark.asyncio
async def test_unauthorized_access(client: AsyncClient):
    """GET /api/v1/clients returns 401 without auth."""
    response = await client.get("/api/v1/clients")
    assert response.status_code == 401
