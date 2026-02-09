"""Tests for timesheet management endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_timesheet(client: AsyncClient, auth_headers: dict):
    """POST /api/v1/timesheets creates a new timesheet."""
    response = await client.post(
        "/api/v1/timesheets",
        json={
            "week_starting": "2026-03-02",
        },
        headers=auth_headers,
    )
    assert response.status_code in (200, 201)
    data = response.json()
    assert "id" in data
    assert data["status"] in ("DRAFT", "draft")


@pytest.mark.asyncio
async def test_list_timesheets(client: AsyncClient, auth_headers: dict):
    """GET /api/v1/timesheets returns timesheet list."""
    await client.post(
        "/api/v1/timesheets",
        json={"week_starting": "2026-03-09"},
        headers=auth_headers,
    )
    response = await client.get("/api/v1/timesheets", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_submit_timesheet(client: AsyncClient, auth_headers: dict):
    """POST /api/v1/timesheets/{id}/submit submits a timesheet."""
    create_resp = await client.post(
        "/api/v1/timesheets",
        json={"week_starting": "2026-03-16"},
        headers=auth_headers,
    )
    ts_id = create_resp.json()["id"]
    response = await client.post(
        f"/api/v1/timesheets/{ts_id}/submit",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("SUBMITTED", "submitted")
