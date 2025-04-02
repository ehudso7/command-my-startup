import pytest
from fastapi import FastAPI
from httpx import AsyncClient

from main import app

# Mock data for tests
test_user = {
    "email": "test@example.com",
    "password": "securePassword123",
    "fullName": "Test User",
}


@pytest.mark.asyncio
async def test_register_user():
    """Test user registration endpoint"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Test successful registration
        response = await client.post("/api/auth/register", json=test_user)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "user" in data

        # Test duplicate email
        response = await client.post("/api/auth/register", json=test_user)
        assert response.status_code == 400  # Should fail with duplicate email


@pytest.mark.asyncio
async def test_login_user():
    """Test user login endpoint"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # First register a user
        await client.post(
            "/api/auth/register",
            json={
                "email": "login-test@example.com",
                "password": "securePassword123",
                "fullName": "Login Test User",
            },
        )

        # Test successful login
        response = await client.post(
            "/api/auth/login",
            json={"email": "login-test@example.com", "password": "securePassword123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "session" in data
        assert "user" in data

        # Test invalid credentials
        response = await client.post(
            "/api/auth/login",
            json={"email": "login-test@example.com", "password": "wrongPassword"},
        )
        assert response.status_code == 400
