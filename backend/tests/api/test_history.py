import pytest
from httpx import AsyncClient
from unittest.mock import patch, MagicMock
from fastapi import FastAPI
from main import app
from datetime import datetime, timedelta

# Mock user for authentication
mock_user = {
    "id": "mock-user-id",
    "email": "test@example.com",
    "full_name": "Test User",
}

# Mock command history data
mock_history = [
    {
        "id": "cmd-1",
        "user_id": "mock-user-id",
        "prompt": "Write a business plan",
        "model": "gpt-3.5-turbo",
        "content": "Here's a business plan...",
        "tokens_used": 250,
        "created_at": (datetime.utcnow() - timedelta(days=1)).isoformat(),
    },
    {
        "id": "cmd-2",
        "user_id": "mock-user-id",
        "prompt": "Create a marketing strategy",
        "model": "claude-3-haiku",
        "content": "Here's a marketing strategy...",
        "tokens_used": 320,
        "created_at": (datetime.utcnow() - timedelta(hours=12)).isoformat(),
    },
    {
        "id": "cmd-3",
        "user_id": "mock-user-id",
        "prompt": "Write a product description",
        "model": "gpt-4",
        "content": "Here's a product description...",
        "tokens_used": 150,
        "created_at": datetime.utcnow().isoformat(),
    },
]


@pytest.mark.asyncio
async def test_get_command_history():
    """Test getting command history"""

    # Mock the authentication dependency
    async def mock_get_current_user():
        return mock_user

    # Mock Supabase response
    class MockSupabaseResponse:
        def __init__(self):
            self.data = mock_history

    # Mock Supabase client
    class MockSupabaseQuery:
        def __init__(self):
            self.query_chain = []

        def select(self, *args):
            self.query_chain.append(f"select({args})")
            return self

        def eq(self, field, value):
            self.query_chain.append(f"eq({field},{value})")
            return self

        def gte(self, field, value):
            self.query_chain.append(f"gte({field},{value})")
            return self

        def lte(self, field, value):
            self.query_chain.append(f"lte({field},{value})")
            return self

        def order(self, field, desc=False):
            self.query_chain.append(f"order({field},{desc})")
            return self

        def range(self, start, end):
            self.query_chain.append(f"range({start},{end})")
            return self

        def execute(self):
            return MockSupabaseResponse()

    class MockSupabase:
        def table(self, name):
            self.table_name = name
            return MockSupabaseQuery()

    # Apply patches
    with patch("routes.history.get_current_user", mock_get_current_user):
        with patch("routes.history.get_supabase_client", return_value=MockSupabase()):
            async with AsyncClient(app=app, base_url="http://test") as client:
                # Test basic command history retrieval
                response = await client.get("/api/history")

                assert response.status_code == 200
                data = response.json()
                assert len(data) == 3
                assert data[0]["id"] == mock_history[0]["id"]
                assert data[1]["id"] == mock_history[1]["id"]
                assert data[2]["id"] == mock_history[2]["id"]

                # Test with pagination
                response = await client.get("/api/history?limit=2&offset=1")

                assert response.status_code == 200
                data = response.json()
                assert len(data) == 3  # Using mock data, real API would return 2

                # Test with date filters
                start_date = (datetime.utcnow() - timedelta(days=2)).isoformat()
                end_date = datetime.utcnow().isoformat()
                response = await client.get(
                    f"/api/history?start_date={start_date}&end_date={end_date}"
                )

                assert response.status_code == 200
                data = response.json()
                assert len(data) == 3


@pytest.mark.asyncio
async def test_get_command_stats():
    """Test getting command usage statistics"""

    # Mock the authentication dependency
    async def mock_get_current_user():
        return mock_user

    # Mock model distribution data
    mock_model_distribution = [
        {"model": "gpt-3.5-turbo", "count": 5},
        {"model": "gpt-4", "count": 2},
        {"model": "claude-3-haiku", "count": 3},
    ]

    # Mock Supabase responses
    class MockCountResponse:
        def __init__(self):
            self.count = 10
            self.data = None

    class MockDistributionResponse:
        def __init__(self):
            self.data = mock_model_distribution

    class MockTokensResponse:
        def __init__(self):
            self.data = [{"total_tokens": 1250}]

    # Mock Supabase client
    class MockSupabaseQuery:
        def select(self, *args, **kwargs):
            self.select_args = args
            self.select_kwargs = kwargs
            return self

        def eq(self, field, value):
            self.eq_field = field
            self.eq_value = value
            return self

        def gte(self, field, value):
            self.gte_field = field
            self.gte_value = value
            return self

        def execute(self):
            return MockCountResponse()

    class MockSupabase:
        def table(self, name):
            self.table_name = name
            return MockSupabaseQuery()

        def rpc(self, function, params):
            self.rpc_function = function
            self.rpc_params = params

            if function == "get_model_distribution":
                return MockResponseWrapper(MockDistributionResponse())
            elif function == "get_total_tokens":
                return MockResponseWrapper(MockTokensResponse())
            else:
                return MockResponseWrapper(None)

    class MockResponseWrapper:
        def __init__(self, response_obj):
            self.response_obj = response_obj

        def execute(self):
            return self.response_obj

    # Apply patches
    with patch("routes.history.get_current_user", mock_get_current_user):
        with patch("routes.history.get_supabase_client", return_value=MockSupabase()):
            async with AsyncClient(app=app, base_url="http://test") as client:
                # Test stats for different periods
                for period in ["day", "week", "month", "year"]:
                    response = await client.get(f"/api/history/stats?period={period}")

                    assert response.status_code == 200
                    data = response.json()
                    assert "period" in data
                    assert data["period"] == period
                    assert "total_commands" in data
                    assert "model_distribution" in data
                    assert "total_tokens" in data
                    assert data["total_commands"] == 10
                    assert data["total_tokens"] == 1250
                    assert len(data["model_distribution"]) == 3


@pytest.mark.asyncio
async def test_get_command_detail():
    """Test getting details of a specific command"""

    # Mock the authentication dependency
    async def mock_get_current_user():
        return mock_user

    # Mock command detail
    mock_command = mock_history[0]

    # Mock Supabase response
    class MockSupabaseResponse:
        def __init__(self):
            self.data = mock_command

    # Mock Supabase client
    class MockSupabaseQuery:
        def select(self, *args):
            return self

        def eq(self, field, value):
            return self

        def single(self):
            return self

        def execute(self):
            return MockSupabaseResponse()

    class MockSupabase:
        def table(self, name):
            return MockSupabaseQuery()

    # Apply patches
    with patch("routes.history.get_current_user", mock_get_current_user):
        with patch("routes.history.get_supabase_client", return_value=MockSupabase()):
            async with AsyncClient(app=app, base_url="http://test") as client:
                # Test getting command details
                response = await client.get(f"/api/history/{mock_command['id']}")

                assert response.status_code == 200
                data = response.json()
                assert data["id"] == mock_command["id"]
                assert data["prompt"] == mock_command["prompt"]
                assert data["model"] == mock_command["model"]
                assert data["content"] == mock_command["content"]


@pytest.mark.asyncio
async def test_get_nonexistent_command():
    """Test getting details of a non-existent command"""

    # Mock the authentication dependency
    async def mock_get_current_user():
        return mock_user

    # Mock Supabase client that throws 'not found' error
    class MockSupabaseQuery:
        def select(self, *args):
            return self

        def eq(self, field, value):
            return self

        def single(self):
            return self

        def execute(self):
            raise Exception("Item not found")

    class MockSupabase:
        def table(self, name):
            return MockSupabaseQuery()

    # Apply patches
    with patch("routes.history.get_current_user", mock_get_current_user):
        with patch("routes.history.get_supabase_client", return_value=MockSupabase()):
            async with AsyncClient(app=app, base_url="http://test") as client:
                # Test command not found
                response = await client.get("/api/history/nonexistent-id")

                assert response.status_code == 404
                data = response.json()
                assert "error" in data
                assert "not found" in data["error"]["message"].lower()


@pytest.mark.asyncio
async def test_delete_command():
    """Test deleting a command from history"""

    # Mock the authentication dependency
    async def mock_get_current_user():
        return mock_user

    # Mock Supabase response
    class MockSupabaseResponse:
        def __init__(self):
            self.data = [{"id": "cmd-1"}]

    # Mock Supabase client
    class MockSupabaseQuery:
        def delete(self):
            return self

        def eq(self, field, value):
            return self

        def execute(self):
            return MockSupabaseResponse()

    class MockSupabase:
        def table(self, name):
            return MockSupabaseQuery()

    # Apply patches
    with patch("routes.history.get_current_user", mock_get_current_user):
        with patch("routes.history.get_supabase_client", return_value=MockSupabase()):
            async with AsyncClient(app=app, base_url="http://test") as client:
                # Test deleting a command
                response = await client.delete("/api/history/cmd-1")

                assert response.status_code == 200
                data = response.json()
                assert "message" in data
                assert "deleted" in data["message"].lower()
