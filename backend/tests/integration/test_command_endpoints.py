import pytest
from httpx import AsyncClient
from unittest.mock import patch, MagicMock, AsyncMock
import uuid

from main import app
from auth.utils import create_access_token


# Mock data for tests
mock_user_id = str(uuid.uuid4())
mock_user = {
    "id": mock_user_id,
    "email": "test@example.com",
    "full_name": "Test User",
    "created_at": "2023-06-01T12:00:00Z"
}

# Create a real JWT token for testing
test_token = create_access_token({"sub": mock_user_id})


@pytest.mark.asyncio
async def test_command_endpoint_authorized():
    """Test the command execution endpoint with valid authorization"""
    # Mock the JWT validation and AI generation
    with patch('auth.utils.jwt.decode', return_value={"sub": mock_user_id}), \
         patch('auth.utils.get_supabase_client') as mock_get_client, \
         patch('lib.ai_client.generate_response', new_callable=AsyncMock) as mock_generate:
        
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
            "tokens_used": 150
        }
        
        # Test the endpoint
        async with AsyncClient(app=app, base_url="http://test") as client:
            client.headers = {"Authorization": f"Bearer {test_token}"}
            
            response = await client.post(
                "/api/commands",
                json={
                    "prompt": "Generate a landing page",
                    "model": "gpt-3.5-turbo"
                }
            )
            
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
            assert kwargs["prompt"] == "Generate a landing page"
            assert kwargs["model"] == "gpt-3.5-turbo"


@pytest.mark.asyncio
async def test_command_endpoint_unauthorized():
    """Test the command endpoint without authorization"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/commands",
            json={
                "prompt": "Generate a landing page",
                "model": "gpt-3.5-turbo"
            }
        )
        
        # Verify unauthorized response
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data


@pytest.mark.asyncio
async def test_command_endpoint_validation_error():
    """Test the command endpoint with invalid input"""
    # Mock the JWT validation
    with patch('auth.utils.jwt.decode', return_value={"sub": mock_user_id}), \
         patch('auth.utils.get_supabase_client') as mock_get_client:
        
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
                }
            )
            
            # Verify validation error
            assert response.status_code == 422  # Unprocessable Entity
            data = response.json()
            assert "detail" in data