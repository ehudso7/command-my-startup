import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

from main import app

# Mock Supabase responses for integration tests
mock_user_id = str(uuid.uuid4())
mock_user = {
    "id": mock_user_id,
    "email": "test@example.com",
    "full_name": "Test User",
    "created_at": "2023-06-01T12:00:00Z",
}

mock_session = {
    "access_token": "mock.jwt.token",
    "token_type": "bearer",
    "expires_in": 3600,
    "refresh_token": "mock.refresh.token",
}


class MockSupabaseAuthResponse:
    def __init__(self, user=None, session=None):
        self.user = user
        self.session = (
            MagicMock(
                access_token=session["access_token"] if session else None,
                expires_in=session["expires_in"] if session else None,
                refresh_token=session["refresh_token"] if session else None,
            )
            if session
            else None
        )


@pytest.mark.asyncio
async def test_register_endpoint():
    """Test the user registration endpoint with mocked Supabase"""
    with patch("lib.supabase.create_client") as mock_create_client:
        # Setup mock Supabase client
        mock_client = MagicMock()
        mock_auth = MagicMock()
        mock_auth.sign_up.return_value = MockSupabaseAuthResponse(user=mock_user)
        mock_client.auth = mock_auth
        mock_create_client.return_value = mock_client

        # Test successful registration
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/auth/register",
                json={
                    "email": "test@example.com",
                    "password": "securePassword123",
                    "full_name": "Test User",
                },
            )

            # Verify response
            assert response.status_code == 200
            data = response.json()
            assert "message" in data
            assert "user" in data
            assert data["user"] == mock_user

            # Verify Supabase was called correctly
            mock_auth.sign_up.assert_called_once()
            args, kwargs = mock_auth.sign_up.call_args
            assert kwargs["email"] == "test@example.com"
            assert kwargs["password"] == "securePassword123"
            assert kwargs["options"]["data"]["full_name"] == "Test User"


@pytest.mark.asyncio
async def test_login_endpoint():
    """Test the user login endpoint with mocked Supabase"""
    with patch("lib.supabase.create_client") as mock_create_client:
        # Setup mock Supabase client
        mock_client = MagicMock()
        mock_auth = MagicMock()
        mock_auth.sign_in_with_password.return_value = MockSupabaseAuthResponse(
            user=mock_user, session=mock_session
        )
        mock_client.auth = mock_auth
        mock_create_client.return_value = mock_client

        # Test successful login
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/auth/login",
                json={"email": "test@example.com", "password": "securePassword123"},
            )

            # Verify response
            assert response.status_code == 200
            data = response.json()
            assert "message" in data
            assert "session" in data
            assert "user" in data
            assert data["user"] == mock_user
            assert data["session"]["access_token"] == mock_session["access_token"]
            assert data["session"]["token_type"] == "bearer"

            # Verify Supabase was called correctly
            mock_auth.sign_in_with_password.assert_called_once()
            args, kwargs = mock_auth.sign_in_with_password.call_args
            assert kwargs["email"] == "test@example.com"
            assert kwargs["password"] == "securePassword123"


@pytest.mark.asyncio
async def test_login_endpoint_invalid_credentials():
    """Test the login endpoint with invalid credentials"""
    with patch("lib.supabase.create_client") as mock_create_client:
        # Setup mock Supabase client
        mock_client = MagicMock()
        mock_auth = MagicMock()
        mock_auth.sign_in_with_password.side_effect = Exception(
            "Invalid login credentials"
        )
        mock_client.auth = mock_auth
        mock_create_client.return_value = mock_client

        # Test login with invalid credentials
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/auth/login",
                json={"email": "test@example.com", "password": "wrongPassword"},
            )

            # Verify response
            assert response.status_code == 400
            data = response.json()
            assert "detail" in data
            assert "Invalid" in data["detail"]
