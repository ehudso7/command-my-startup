import pytest
from httpx import AsyncClient
from unittest.mock import patch, MagicMock, AsyncMock
import uuid
from datetime import datetime

from main import app
from auth.utils import create_access_token
from models.command import AIModel


# Mock data for tests
mock_user_id = str(uuid.uuid4())
mock_user = {
    "id": mock_user_id,
    "email": "test@example.com",
    "full_name": "Test User",
    "created_at": "2023-06-01T12:00:00Z",
}

# Create a real JWT token for testing
test_token = create_access_token({"sub": mock_user_id})

# Test command data
test_command = {
    "prompt": "Generate a landing page",
    "model": "gpt-3.5-turbo",
    "temperature": 0.7,
}


@pytest.mark.asyncio
async def test_command_endpoint_authorized():
    """Test the command execution endpoint with valid authorization"""
    # Mock the JWT validation and AI generation
    with patch("auth.utils.jwt.decode", return_value={"sub": mock_user_id}), patch(
        "auth.utils.get_supabase_client"
    ) as mock_get_client, patch(
        "lib.ai_client.generate_response", new_callable=AsyncMock
    ) as mock_generate:
        # Setup mock responses
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_select = MagicMock()
        mock_eq = MagicMock()
        mock_single = MagicMock()
        mock_execute = MagicMock()
        mock_execute.execute.return_value.data = mock_user

        mock_single.return_value = mock_execute
        mock_eq.return_value = mock_single
        mock_select.return_value = mock_eq
        mock_table.select.return_value = mock_select
        mock_supabase.table.return_value = mock_table
        mock_get_client.return_value = mock_supabase

        # Mock AI response
        command_id = str(uuid.uuid4())
        mock_generate.return_value = {
            "id": "response-id-123",
            "content": "This is a generated response",
            "model": "gpt-3.5-turbo",
            "created_at": "2023-06-01T12:00:00Z",
            "tokens_used": 150,
        }

        # Test the endpoint
        async with AsyncClient(app=app, base_url="http://test") as client:
            client.headers = {"Authorization": f"Bearer {test_token}"}

            response = await client.post("/api/commands", json=test_command)

            # Verify response
            assert response.status_code == 200
            data = response.json()
            assert "id" in data
            assert "content" in data
            assert data["content"] == "This is a generated response"
            assert data["model"] == "gpt-3.5-turbo"

            # Verify AI was called correctly
            mock_generate.assert_called_once()
            args, kwargs = mock_generate.call_args
            assert kwargs["prompt"] == test_command["prompt"]
            assert kwargs["model"] == test_command["model"]
            assert kwargs["temperature"] == test_command["temperature"]


@pytest.mark.asyncio
async def test_command_endpoint_unauthorized():
    """Test the command endpoint without authorization"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/api/commands", json=test_command)

        # Verify unauthorized response
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data


@pytest.mark.asyncio
async def test_command_endpoint_validation_error():
    """Test the command endpoint with invalid input"""
    # Mock the JWT validation
    with patch("auth.utils.jwt.decode", return_value={"sub": mock_user_id}), patch(
        "auth.utils.get_supabase_client"
    ) as mock_get_client:
        # Setup mock supabase response
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_select = MagicMock()
        mock_eq = MagicMock()
        mock_single = MagicMock()
        mock_execute = MagicMock()
        mock_execute.execute.return_value.data = mock_user

        mock_single.return_value = mock_execute
        mock_eq.return_value = mock_single
        mock_select.return_value = mock_eq
        mock_table.select.return_value = mock_select
        mock_supabase.table.return_value = mock_table
        mock_get_client.return_value = mock_supabase

        # Test the endpoint with missing prompt
        async with AsyncClient(app=app, base_url="http://test") as client:
            client.headers = {"Authorization": f"Bearer {test_token}"}

            response = await client.post(
                "/api/commands",
                json={
                    "model": "gpt-3.5-turbo"
                    # Missing required prompt
                },
            )

            # Verify validation error
            assert response.status_code == 422  # Unprocessable Entity
            data = response.json()
            assert "detail" in data


@pytest.mark.asyncio
async def test_command_with_advanced_options():
    """Test command execution with advanced options like system prompt and max tokens"""
    # Mock the JWT validation and AI generation
    with patch("auth.utils.jwt.decode", return_value={"sub": mock_user_id}), patch(
        "auth.utils.get_supabase_client"
    ) as mock_get_client, patch(
        "lib.ai_client.generate_response", new_callable=AsyncMock
    ) as mock_generate:
        # Setup mock supabase response
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_get_client.return_value = mock_supabase

        # Setup user auth mock
        mock_user_table = MagicMock()
        mock_user_select = MagicMock()
        mock_user_eq = MagicMock()
        mock_user_single = MagicMock()
        mock_user_execute = MagicMock()
        mock_user_execute.execute.return_value.data = mock_user

        mock_user_single.return_value = mock_user_execute
        mock_user_eq.return_value = mock_user_single
        mock_user_select.return_value = mock_user_eq
        mock_user_table.select.return_value = mock_user_select

        # Mock table method to return different mocks for different tables
        def mock_table_method(table_name):
            if table_name == "users":
                return mock_user_table
            return mock_table

        mock_supabase.table.side_effect = mock_table_method

        # Mock AI response
        mock_generate.return_value = {
            "id": "advanced-response-id",
            "content": "This is a response with advanced options",
            "model": "claude-3-sonnet",
            "created_at": datetime.utcnow().isoformat(),
            "tokens_used": 250,
        }

        # Test the endpoint with advanced options
        async with AsyncClient(app=app, base_url="http://test") as client:
            client.headers = {"Authorization": f"Bearer {test_token}"}

            advanced_command = {
                "prompt": "Write a technical article",
                "model": "claude-3-sonnet",
                "system_prompt": "You are a technical writer specializing in AI.",
                "temperature": 0.5,
                "max_tokens": 2000,
                "context": {"topic": "machine learning", "audience": "developers"},
            }

            response = await client.post("/api/commands", json=advanced_command)

            # Verify response
            assert response.status_code == 200
            data = response.json()
            assert data["content"] == "This is a response with advanced options"
            assert data["model"] == "claude-3-sonnet"

            # Verify AI was called with all options
            mock_generate.assert_called_once()
            args, kwargs = mock_generate.call_args
            assert kwargs["prompt"] == advanced_command["prompt"]
            assert kwargs["model"] == advanced_command["model"]
            assert kwargs["system_prompt"] == advanced_command["system_prompt"]
            assert kwargs["temperature"] == advanced_command["temperature"]
            assert kwargs["max_tokens"] == advanced_command["max_tokens"]


@pytest.mark.asyncio
async def test_command_with_error_handling():
    """Test error handling when the AI service throws an exception"""
    # Mock the JWT validation
    with patch("auth.utils.jwt.decode", return_value={"sub": mock_user_id}), patch(
        "auth.utils.get_supabase_client"
    ) as mock_get_client, patch(
        "lib.ai_client.generate_response", new_callable=AsyncMock
    ) as mock_generate:
        # Setup mock supabase user response
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_select = MagicMock()
        mock_eq = MagicMock()
        mock_single = MagicMock()
        mock_execute = MagicMock()
        mock_execute.execute.return_value.data = mock_user

        mock_single.return_value = mock_execute
        mock_eq.return_value = mock_single
        mock_select.return_value = mock_eq
        mock_table.select.return_value = mock_select
        mock_supabase.table.return_value = mock_table
        mock_get_client.return_value = mock_supabase

        # Mock AI error
        mock_generate.side_effect = Exception("AI service unavailable")

        # Test the endpoint
        async with AsyncClient(app=app, base_url="http://test") as client:
            client.headers = {"Authorization": f"Bearer {test_token}"}

            response = await client.post("/api/commands", json=test_command)

            # Verify error response
            assert response.status_code == 500
            data = response.json()
            assert "error" in data
            assert "message" in data["error"]
            assert "AI service unavailable" in data["error"]["message"]


@pytest.mark.asyncio
async def test_command_history_storage():
    """Test that command execution is properly stored in history"""
    # Mock the JWT validation and AI generation
    with patch("auth.utils.jwt.decode", return_value={"sub": mock_user_id}), patch(
        "auth.utils.get_supabase_client"
    ) as mock_get_client, patch(
        "lib.ai_client.generate_response", new_callable=AsyncMock
    ) as mock_generate:
        # Setup mock supabase and user auth
        mock_supabase = MagicMock()
        mock_user_table = MagicMock()
        mock_user_select = MagicMock()
        mock_user_eq = MagicMock()
        mock_user_single = MagicMock()
        mock_user_execute = MagicMock()
        mock_user_execute.execute.return_value.data = mock_user

        mock_user_single.return_value = mock_user_execute
        mock_user_eq.return_value = mock_user_single
        mock_user_select.return_value = mock_user_eq
        mock_user_table.select.return_value = mock_user_select

        # Mock history table
        mock_history_table = MagicMock()
        mock_history_insert = MagicMock()
        mock_history_execute = MagicMock()
        mock_history_execute.execute.return_value.data = [{"id": "history-123"}]

        mock_history_insert.return_value = mock_history_execute
        mock_history_table.insert.return_value = mock_history_insert

        # Mock table method to return different mocks for different tables
        def mock_table_method(table_name):
            if table_name == "users":
                return mock_user_table
            elif table_name == "command_history":
                return mock_history_table
            return MagicMock()

        mock_supabase.table.side_effect = mock_table_method
        mock_get_client.return_value = mock_supabase

        # Mock AI response
        ai_response = {
            "id": "ai-response-id",
            "content": "This is a generated response that should be stored",
            "model": "gpt-3.5-turbo",
            "created_at": datetime.utcnow().isoformat(),
            "tokens_used": 175,
        }
        mock_generate.return_value = ai_response

        # Test the endpoint
        async with AsyncClient(app=app, base_url="http://test") as client:
            client.headers = {"Authorization": f"Bearer {test_token}"}

            response = await client.post("/api/commands", json=test_command)

            # Verify the command was stored in history
            assert mock_supabase.table.call_args_list[1][0][0] == "command_history"
            mock_history_table.insert.assert_called_once()

            # Verify the stored data
            history_data = mock_history_table.insert.call_args[0][0]
            assert history_data["user_id"] == mock_user["id"]
            assert history_data["prompt"] == test_command["prompt"]
            assert history_data["model"] == test_command["model"]
            assert history_data["content"] == ai_response["content"]
            assert history_data["tokens_used"] == ai_response["tokens_used"]
