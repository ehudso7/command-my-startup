import pytest
from httpx import AsyncClient
from unittest.mock import patch, MagicMock
from fastapi import FastAPI
from main import app

# Mock user for authentication
mock_user = {
    "id": "mock-user-id",
    "email": "test@example.com",
    "full_name": "Test User"
}

# Test data
updated_profile = {
    "email": "updated@example.com",
    "full_name": "Updated User"
}

@pytest.mark.asyncio
async def test_get_user_profile():
    """Test getting user profile"""
    # Mock the authentication dependency
    async def mock_get_current_user():
        return mock_user

    # Apply patch
    with patch("routes.profile.get_current_user", mock_get_current_user):
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Test successful profile retrieval
            response = await client.get("/api/profile")
            
            assert response.status_code == 200
            data = response.json()
            assert "profile" in data
            assert data["profile"]["email"] == mock_user["email"]
            assert data["profile"]["full_name"] == mock_user["full_name"]

@pytest.mark.asyncio
async def test_update_user_profile():
    """Test updating user profile"""
    # Mock the authentication dependency
    async def mock_get_current_user():
        return mock_user

    # Mock Supabase response
    class MockSupabaseResponse:
        def __init__(self):
            self.data = [updated_profile]

    # Mock Supabase client
    class MockSupabaseTable:
        def update(self, data):
            self.update_data = data
            return self
            
        def eq(self, field, value):
            self.eq_field = field
            self.eq_value = value
            return self
            
        def execute(self):
            return MockSupabaseResponse()

    class MockSupabase:
        def table(self, name):
            self.table_name = name
            return MockSupabaseTable()
    
    # Apply patches
    with patch("routes.profile.get_current_user", mock_get_current_user):
        with patch("routes.profile.get_supabase_client", return_value=MockSupabase()):
            async with AsyncClient(app=app, base_url="http://test") as client:
                # Test successful profile update
                response = await client.put(
                    "/api/profile",
                    json=updated_profile
                )
                
                assert response.status_code == 200
                data = response.json()
                assert "message" in data
                assert "profile" in data
                assert data["profile"]["email"] == updated_profile["email"]
                assert data["profile"]["full_name"] == updated_profile["full_name"]

@pytest.mark.asyncio
async def test_get_api_keys():
    """Test getting user's API keys"""
    # Mock the authentication dependency
    async def mock_get_current_user():
        return mock_user

    # Mock API keys
    mock_keys = [
        {
            "id": "key-1",
            "name": "Test Key 1",
            "prefix": "cms_1234",
            "created_at": "2025-01-01T00:00:00Z"
        },
        {
            "id": "key-2",
            "name": "Test Key 2",
            "prefix": "cms_5678",
            "created_at": "2025-01-02T00:00:00Z"
        }
    ]

    # Mock Supabase response
    class MockSupabaseResponse:
        def __init__(self):
            self.data = mock_keys

    # Mock Supabase client
    class MockSupabaseTable:
        def select(self, *args):
            return self
            
        def eq(self, field, value):
            return self
            
        def execute(self):
            return MockSupabaseResponse()

    class MockSupabase:
        def table(self, name):
            return MockSupabaseTable()
    
    # Apply patches
    with patch("routes.profile.get_current_user", mock_get_current_user):
        with patch("routes.profile.get_supabase_client", return_value=MockSupabase()):
            async with AsyncClient(app=app, base_url="http://test") as client:
                # Test successful API keys retrieval
                response = await client.get("/api/profile/api-keys")
                
                assert response.status_code == 200
                data = response.json()
                assert len(data) == 2
                assert data[0]["id"] == mock_keys[0]["id"]
                assert data[1]["id"] == mock_keys[1]["id"]

@pytest.mark.asyncio
async def test_create_api_key():
    """Test creating a new API key"""
    # Mock the authentication dependency
    async def mock_get_current_user():
        return mock_user

    # Mock key creation response
    mock_created_key = {
        "id": "new-key-id"
    }

    # Mock Supabase response
    class MockSupabaseResponse:
        def __init__(self):
            self.data = [mock_created_key]

    # Mock Supabase client
    class MockSupabaseTable:
        def insert(self, data):
            self.insert_data = data
            return self
            
        def execute(self):
            return MockSupabaseResponse()
        
        def sql(self, query):
            return "NOW()"

    class MockSupabase:
        def table(self, name):
            return MockSupabaseTable()
    
    # Apply patches
    with patch("routes.profile.get_current_user", mock_get_current_user):
        with patch("routes.profile.get_supabase_client", return_value=MockSupabase()):
            async with AsyncClient(app=app, base_url="http://test") as client:
                # Test successful API key creation
                response = await client.post(
                    "/api/profile/api-keys?name=New%20Test%20Key"
                )
                
                assert response.status_code == 200
                data = response.json()
                assert "message" in data
                assert "key" in data
                assert "name" in data
                assert "prefix" in data
                assert data["name"] == "New Test Key"
                assert data["key"].startswith("cms_")

@pytest.mark.asyncio
async def test_delete_api_key():
    """Test deleting an API key"""
    # Mock the authentication dependency
    async def mock_get_current_user():
        return mock_user

    # Mock Supabase response
    class MockSupabaseResponse:
        def __init__(self):
            self.data = [{"id": "deleted-key"}]

    # Mock Supabase client
    class MockSupabaseTable:
        def delete(self):
            return self
            
        def eq(self, field, value):
            return self
            
        def execute(self):
            return MockSupabaseResponse()

    class MockSupabase:
        def table(self, name):
            return MockSupabaseTable()
    
    # Apply patches
    with patch("routes.profile.get_current_user", mock_get_current_user):
        with patch("routes.profile.get_supabase_client", return_value=MockSupabase()):
            async with AsyncClient(app=app, base_url="http://test") as client:
                # Test successful API key deletion
                response = await client.delete(
                    "/api/profile/api-keys/key-123"
                )
                
                assert response.status_code == 200
                data = response.json()
                assert "message" in data
                assert "deleted" in data["message"].lower()

@pytest.mark.asyncio
async def test_delete_nonexistent_api_key():
    """Test deleting a non-existent API key"""
    # Mock the authentication dependency
    async def mock_get_current_user():
        return mock_user

    # Mock Supabase response with no data (key not found)
    class MockSupabaseResponse:
        def __init__(self):
            self.data = []

    # Mock Supabase client
    class MockSupabaseTable:
        def delete(self):
            return self
            
        def eq(self, field, value):
            return self
            
        def execute(self):
            return MockSupabaseResponse()

    class MockSupabase:
        def table(self, name):
            return MockSupabaseTable()
    
    # Apply patches
    with patch("routes.profile.get_current_user", mock_get_current_user):
        with patch("routes.profile.get_supabase_client", return_value=MockSupabase()):
            async with AsyncClient(app=app, base_url="http://test") as client:
                # Test API key not found
                response = await client.delete(
                    "/api/profile/api-keys/nonexistent-key"
                )
                
                assert response.status_code == 404
                data = response.json()
                assert "error" in data
                assert "not found" in data["error"]["message"].lower()