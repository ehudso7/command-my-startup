import pytest
from httpx import AsyncClient
from fastapi import FastAPI
from main import app

# Mock authentication for tests
@pytest.fixture
async def authenticated_client():
    """Create an authenticated client for testing protected endpoints"""
    # In a real test, you would use the actual auth flow
    # Here we'll mock authentication by adding an auth header
    async with AsyncClient(app=app, base_url="http://test") as client:
        client.headers.update({"Authorization": "Bearer test_token"})
        yield client

@pytest.mark.asyncio
async def test_execute_command(authenticated_client):
    """Test command execution endpoint"""
    # Test successful command execution
    response = await authenticated_client.post(
        "/api/commands",
        json={
            "prompt": "Create a landing page",
            "model": "gpt-3.5-turbo"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "content" in data
    
    # Test missing prompt
    response = await authenticated_client.post(
        "/api/commands",
        json={
            "model": "gpt-3.5-turbo"
        }
    )
    assert response.status_code == 422  # Validation error

@pytest.mark.asyncio
async def test_unauthorized_command():
    """Test that unauthorized requests are rejected"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/commands",
            json={
                "prompt": "Create a landing page",
                "model": "gpt-3.5-turbo"
            }
        )
        assert response.status_code == 401  # Unauthorized
