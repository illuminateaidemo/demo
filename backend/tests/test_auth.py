"""Tests for authentication endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    """POST /api/v1/auth/register creates a new user."""
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@example.com",
            "full_name": "New User",
            "password": "securepass123",
            "role": "CONSULTANT",
            "office": "London",
            "practice": "Technology",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["full_name"] == "New User"
    assert data["role"] == "CONSULTANT"
    assert "id" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    """POST /api/v1/auth/register rejects duplicate emails."""
    payload = {
        "email": "dup@example.com",
        "full_name": "Dup User",
        "password": "pass123",
        "role": "CONSULTANT",
    }
    await client.post("/api/v1/auth/register", json=payload)
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """POST /api/v1/auth/login returns a JWT token for valid credentials."""
    # Register first
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "login@example.com",
            "full_name": "Login User",
            "password": "mypassword",
            "role": "CONSULTANT",
        },
    )
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "login@example.com", "password": "mypassword"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    """POST /api/v1/auth/login returns 401 for wrong password."""
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "wrongpw@example.com",
            "full_name": "Wrong PW",
            "password": "correct",
            "role": "CONSULTANT",
        },
    )
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "wrongpw@example.com", "password": "incorrect"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient, auth_headers: dict):
    """GET /api/v1/auth/me returns the current user profile."""
    response = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "testadmin@example.com"
    assert data["role"] == "ADMIN"


@pytest.mark.asyncio
async def test_get_me_unauthorized(client: AsyncClient):
    """GET /api/v1/auth/me returns 401 without a token."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
