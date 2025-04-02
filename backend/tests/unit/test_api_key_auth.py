import pytest
from httpx import AsyncClient
from unittest.mock import patch, MagicMock, AsyncMock
import uuid
import hashlib

from main import app
from middleware.request_validator import APIKeyUserDependency


# Mock API key and user
mock_api_key = "cms_" + "a" * 32
mock_key_hash = hashlib.sha256(mock_api_key.encode()).hexdigest()
mock_key_id = str(uuid.uuid4())
mock_user_id = str(uuid.uuid4())
mock_user = {
    "id": mock_user_id,
    "email": "test@example.com",
    "full_name": "API Key Test User",
}


@pytest.mark.asyncio
async def test_api_key_middleware():
    """Test that API key middleware extracts and validates API keys"""
    # Mock the Supabase client for API key validation
    with patch("middleware.request_validator.get_supabase_client") as mock_get_client:
        # Setup mock responses
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_select = MagicMock()
        mock_eq = MagicMock()
        mock_single = MagicMock()
        mock_execute = MagicMock()

        # Mock API key lookup response
        mock_execute.execute.return_value.data = {
            "id": mock_key_id,
            "user_id": mock_user_id,
        }

        # Setup mock chain
        mock_single.return_value = mock_execute
        mock_eq.return_value = mock_single
        mock_select.return_value = mock_eq
        mock_table.select.return_value = mock_select
        mock_table.update.return_value = mock_eq  # For last_used_at update
        mock_supabase.table.return_value = mock_table
        mock_get_client.return_value = mock_supabase

        # Test the middleware via a command endpoint
        async with AsyncClient(app=app, base_url="http://test") as client:
            client.headers = {"X-API-Key": mock_api_key}

            # Additional mocks for command execution
            with patch(
                "routes.commands.get_current_user",
                side_effect=Exception("Should not be called"),
            ), patch(
                "lib.ai_client.generate_response", new_callable=AsyncMock
            ) as mock_generate:
                # Mock AI response
                mock_generate.return_value = {
                    "id": "response-id-123",
                    "content": "Response via API key auth",
                    "model": "gpt-3.5-turbo",
                    "created_at": "2025-01-01T00:00:00Z",
                    "tokens_used": 150,
                }

                # Mock user lookup for APIKeyUserDependency
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

                # Update mock table method to return different mocks for different tables
                def mock_table_method(table_name):
                    if table_name == "api_keys":
                        return mock_table
                    elif table_name == "users":
                        return mock_user_table
                    return MagicMock()

                mock_supabase.table.side_effect = mock_table_method

                # Make the request
                response = await client.post(
                    "/api/commands",
                    json={"prompt": "Test API key auth", "model": "gpt-3.5-turbo"},
                )

                # Verify response
                assert response.status_code == 200
                data = response.json()
                assert "content" in data
                assert data["content"] == "Response via API key auth"

                # Verify API key was validated
                mock_table.select.assert_called_with("id", "user_id")
                mock_eq.assert_called_with("key_hash", mock_key_hash)

                # Verify user was fetched
                mock_user_table.select.assert_called_with("*")
                mock_user_eq.assert_called_with("id", mock_user_id)

                # Verify last_used_at was updated
                assert mock_table.update.called


@pytest.mark.asyncio
async def test_invalid_api_key():
    """Test behavior with an invalid API key"""
    # Mock the Supabase client for API key validation
    with patch("middleware.request_validator.get_supabase_client") as mock_get_client:
        # Setup mock responses to return no data (key not found)
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_select = MagicMock()
        mock_eq = MagicMock()
        mock_single = MagicMock()
        mock_execute = MagicMock()

        # Mock API key lookup response (not found)
        mock_execute.execute.return_value.data = None

        # Setup mock chain
        mock_single.return_value = mock_execute
        mock_eq.return_value = mock_single
        mock_select.return_value = mock_eq
        mock_table.select.return_value = mock_select
        mock_supabase.table.return_value = mock_table
        mock_get_client.return_value = mock_supabase

        # Test the middleware
        async with AsyncClient(app=app, base_url="http://test") as client:
            client.headers = {"X-API-Key": "cms_invalid_key"}

            # Make the request
            response = await client.post(
                "/api/commands",
                json={"prompt": "Test invalid API key", "model": "gpt-3.5-turbo"},
            )

            # Should fail with unauthorized
            assert response.status_code == 401


@pytest.mark.asyncio
async def test_api_key_dependency():
    """Test the APIKeyUserDependency directly"""
    # Create a mock request
    mock_request = MagicMock()
    mock_request.state.user_id = mock_user_id
    mock_request.state.auth_method = "api_key"

    # Mock the Supabase client
    with patch("middleware.request_validator.get_supabase_client") as mock_get_client:
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_select = MagicMock()
        mock_eq = MagicMock()
        mock_single = MagicMock()
        mock_execute = MagicMock()

        # Mock user lookup response
        mock_execute.execute.return_value.data = mock_user

        # Setup mock chain
        mock_single.return_value = mock_execute
        mock_eq.return_value = mock_single
        mock_select.return_value = mock_eq
        mock_table.select.return_value = mock_select
        mock_supabase.table.return_value = mock_table
        mock_get_client.return_value = mock_supabase

        # Test the dependency
        dependency = APIKeyUserDependency()
        result = await dependency(mock_request)

        # Verify the result
        assert result == mock_user
        mock_table.select.assert_called_with("*")
        mock_eq.assert_called_with("id", mock_user_id)
