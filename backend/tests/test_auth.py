import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import json

from main import app

client = TestClient(app)

# Mock user data for testing
test_user = {
    "email": "test@example.com",
    "full_name": "Test User",
    "password": "password123"
}

class MockSupabaseResponse:
    """Mock Supabase auth response"""
    def __init__(self, user=None, session=None):
        self.user = user
        self.session = session

class MockSupabaseSession:
    """Mock Supabase session data"""
    def __init__(self):
        self.access_token = "mock_access_token"
        self.refresh_token = "mock_refresh_token"
        self.expires_in = 3600
        
@pytest.fixture
def mock_supabase_client():
    """Create a mock Supabase client for testing"""
    mock_client = MagicMock()
    mock_client.auth = MagicMock()
    return mock_client

def test_register_success(mock_supabase_client):
    """Test successful user registration"""
    # Mock the response from Supabase
    mock_user = {
        "id": "mock-user-id",
        "email": test_user["email"],
        "user_metadata": {"full_name": test_user["full_name"]}
    }
    mock_response = MockSupabaseResponse(user=mock_user)
    mock_supabase_client.auth.sign_up.return_value = mock_response
    
    # Patch the get_supabase_client function to return our mock
    with patch("routes.auth.get_supabase_client", return_value=mock_supabase_client):
        response = client.post(
            "/api/auth/register",
            json=test_user
        )
        
        # Check response
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "User registered successfully"
        assert data["user"] == mock_user

def test_register_existing_user(mock_supabase_client):
    """Test registration with an existing email"""
    # Mock an error response for existing user
    mock_supabase_client.auth.sign_up.side_effect = Exception("User already registered")
    
    # Patch the get_supabase_client function
    with patch("routes.auth.get_supabase_client", return_value=mock_supabase_client):
        response = client.post(
            "/api/auth/register",
            json=test_user
        )
        
        # Check response
        assert response.status_code == 400
        assert response.json()["error"]["message"] == "Email already registered"

def test_login_success(mock_supabase_client):
    """Test successful login"""
    # Mock the response from Supabase
    mock_user = {
        "id": "mock-user-id",
        "email": test_user["email"],
        "user_metadata": {"full_name": test_user["full_name"]}
    }
    mock_session = MockSupabaseSession()
    mock_response = MockSupabaseResponse(user=mock_user, session=mock_session)
    mock_supabase_client.auth.sign_in_with_password.return_value = mock_response
    
    # Patch the get_supabase_client function
    with patch("routes.auth.get_supabase_client", return_value=mock_supabase_client):
        response = client.post(
            "/api/auth/login",
            json={
                "email": test_user["email"],
                "password": test_user["password"]
            }
        )
        
        # Check response
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Login successful"
        assert data["session"]["access_token"] == "mock_access_token"
        assert data["session"]["refresh_token"] == "mock_refresh_token"
        assert data["user"] == mock_user

def test_login_invalid_credentials(mock_supabase_client):
    """Test login with invalid credentials"""
    # Mock an error response for invalid credentials
    mock_supabase_client.auth.sign_in_with_password.side_effect = Exception("Invalid login credentials")
    
    # Patch the get_supabase_client function
    with patch("routes.auth.get_supabase_client", return_value=mock_supabase_client):
        response = client.post(
            "/api/auth/login",
            json={
                "email": test_user["email"],
                "password": "wrong_password"
            }
        )
        
        # Check response
        assert response.status_code == 400
        assert response.json()["error"]["message"] == "Invalid email or password"

def test_missing_credentials():
    """Test login with missing credentials"""
    response = client.post(
        "/api/auth/login",
        json={
            "email": test_user["email"]
            # Missing password
        }
    )
    
    # Check validation error
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["type"] == "validation_error"
    
    # Check validation error details
    details = error["details"]
    assert any(detail["loc"][-1] == "password" for detail in details)