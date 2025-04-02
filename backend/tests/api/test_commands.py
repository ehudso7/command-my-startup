import pytest
from httpx import AsyncClient
from unittest.mock import patch, MagicMock
from fastapi import FastAPI
from main import app
from models.command import AIModel

# Test data
test_command = {
    "prompt": "Create a landing page",
    "model": "gpt-3.5-turbo",
    "temperature": 0.7,
}

# Mock user for authentication
mock_user = {
    "id": "mock-user-id",
    "email": "test@example.com",
    "full_name": "Test User",
}


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
    response = await authenticated_client.post("/api/commands", json=test_command)
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "content" in data

    # Test missing prompt
    response = await authenticated_client.post(
        "/api/commands", json={"model": "gpt-3.5-turbo"}
    )
    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_unauthorized_command():
    """Test that unauthorized requests are rejected"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/api/commands", json=test_command)
        assert response.status_code == 401  # Unauthorized


@pytest.mark.asyncio
async def test_execute_command_with_mocks():
    """Test command execution with mocked dependencies"""

    # Mock the authentication dependency
    async def mock_get_current_user():
        return mock_user

    # Mock the AI response
    mock_ai_response = {
        "id": "mock-response-id",
        "content": "This is a mock response to your prompt",
        "model": "gpt-3.5-turbo",
        "created_at": "2025-01-01T00:00:00Z",
        "tokens_used": 125,
    }

    # Apply patches
    with patch("routes.commands.get_current_user", mock_get_current_user):
        with patch("routes.commands.generate_response", return_value=mock_ai_response):
            async with AsyncClient(app=app, base_url="http://test") as client:
                # Test command with all parameters
                full_command = test_command.copy()
                full_command["system_prompt"] = "You are a web designer."
                full_command["max_tokens"] = 1000

                response = await client.post("/api/commands", json=full_command)

                assert response.status_code == 200
                data = response.json()
                assert data["content"] == mock_ai_response["content"]
                assert data["model"] == mock_ai_response["model"]
                assert "tokens_used" in data


@pytest.mark.asyncio
async def test_execute_command_with_different_models():
    """Test command execution with different AI models"""

    # Mock the authentication dependency
    async def mock_get_current_user():
        return mock_user

    # Mock the AI response
    def mock_generate_response(**kwargs):
        return {
            "id": "mock-response-id",
            "content": f"Response from model: {kwargs['model']}",
            "model": kwargs["model"],
            "created_at": "2025-01-01T00:00:00Z",
            "tokens_used": 125,
        }

    # Apply patches
    with patch("routes.commands.get_current_user", mock_get_current_user):
        with patch(
            "routes.commands.generate_response", side_effect=mock_generate_response
        ):
            async with AsyncClient(app=app, base_url="http://test") as client:
                # Test with GPT-4
                gpt4_command = test_command.copy()
                gpt4_command["model"] = "gpt-4"

                response = await client.post("/api/commands", json=gpt4_command)

                assert response.status_code == 200
                data = response.json()
                assert "gpt-4" in data["model"]

                # Test with Claude
                claude_command = test_command.copy()
                claude_command["model"] = "claude-3-sonnet"

                response = await client.post("/api/commands", json=claude_command)

                assert response.status_code == 200
                data = response.json()
                assert "claude-3-sonnet" in data["model"]


@pytest.mark.asyncio
async def test_execute_command_with_error():
    """Test command execution when AI service returns an error"""

    # Mock the authentication dependency
    async def mock_get_current_user():
        return mock_user

    # Apply patches
    with patch("routes.commands.get_current_user", mock_get_current_user):
        with patch(
            "routes.commands.generate_response",
            side_effect=Exception("AI service error"),
        ):
            async with AsyncClient(app=app, base_url="http://test") as client:
                # Test command execution with error
                response = await client.post("/api/commands", json=test_command)

                # Should return error
                assert response.status_code == 500
                data = response.json()
                assert "error" in data
                assert "AI service error" in data["error"]["message"]
