import logging
import uuid
from datetime import datetime
from functools import lru_cache
from typing import Any, Dict, List, Optional

from supabase import Client, create_client

from config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


# Default mock client for development/testing when credentials aren't available
class MockSupabaseAuth:
    """Mock Supabase Auth for testing without real credentials"""

    def __init__(self, parent):
        self.parent = parent
        logger.debug("Initialized MockSupabaseAuth")

    def sign_up(self, data):
        """Mock sign up functionality"""
        email = data.get("email", "")

        # Check if user already exists
        if email in self.parent.mock_users:
            raise Exception("User already registered")

        # Create a new mock user
        user_id = str(uuid.uuid4())
        user_data = {
            "id": user_id,
            "email": email,
            "user_metadata": data.get("options", {}).get("data", {}),
            "created_at": datetime.utcnow().isoformat(),
        }

        # Store the user
        self.parent.mock_users[email] = {
            "user": user_data,
            "password": data.get("password", ""),
        }

        # Create mock response
        class MockAuthResponse:
            def __init__(self, user):
                self.user = user
                self.session = None

        return MockAuthResponse(user_data)

    def sign_in_with_password(self, data):
        """Mock sign in functionality"""
        email = data.get("email", "")
        password = data.get("password", "")

        # Check if user exists and password matches
        if (
            email not in self.parent.mock_users
            or self.parent.mock_users[email]["password"] != password
        ):
            raise Exception("Invalid login credentials")

        user_data = self.parent.mock_users[email]["user"]

        # Create a mock session
        class MockSession:
            def __init__(self):
                self.access_token = f"mock_token_{str(uuid.uuid4())}"
                self.refresh_token = f"mock_refresh_{str(uuid.uuid4())}"
                self.expires_in = 3600  # 1 hour in seconds

        # Create mock response
        class MockAuthResponse:
            def __init__(self, user, session):
                self.user = user
                self.session = session

        return MockAuthResponse(user_data, MockSession())

    def get_user(self, token):
        """Mock get user from token"""
        # In a real implementation, this would validate the token
        # For mock purposes, just return a mock user if we have any
        if self.parent.mock_users:
            # Return the first user we have
            first_email = list(self.parent.mock_users.keys())[0]

            class MockUserResponse:
                def __init__(self, user):
                    self.user = user

            return MockUserResponse(self.parent.mock_users[first_email]["user"])

        raise Exception("Invalid token")


class MockSupabaseClient:
    """Mock Supabase client for development/testing without real credentials"""

    def __init__(self):
        logger.warning(
            "Using MockSupabaseClient - no real database operations will be performed"
        )
        self.mock_users = {}  # Store mock users by email
        self.mock_data = {}  # Store mock data by table
        self._auth = MockSupabaseAuth(self)

    @property
    def auth(self):
        return self._auth

    def table(self, table_name):
        """Access a mock table"""
        self.current_table = table_name
        if table_name not in self.mock_data:
            self.mock_data[table_name] = []
        return self

    def select(self, *args, **kwargs):
        """Mock select query"""
        return self

    def insert(self, data, **kwargs):
        """Mock insert operation"""
        if isinstance(data, List):
            # Insert multiple records
            for record in data:
                record["id"] = record.get("id", str(uuid.uuid4()))
                record["created_at"] = record.get(
                    "created_at", datetime.utcnow().isoformat()
                )
                self.mock_data[self.current_table].append(record)
        else:
            # Insert single record
            data["id"] = data.get("id", str(uuid.uuid4()))
            data["created_at"] = data.get("created_at", datetime.utcnow().isoformat())
            self.mock_data[self.current_table].append(data)
        return self

    def update(self, data, **kwargs):
        """Mock update operation"""
        # In a real implementation, this would update existing records
        return self

    def delete(self, **kwargs):
        """Mock delete operation"""
        # In a real implementation, this would delete records
        return self

    def eq(self, field, value):
        """Mock equals filter"""
        if self.current_table in self.mock_data:
            filtered_data = [
                item
                for item in self.mock_data[self.current_table]
                if item.get(field) == value
            ]
            self.filtered_data = filtered_data
        return self

    def single(self):
        """Mock single record return"""
        return self

    def execute(self, *args, **kwargs):
        """Execute the mock query and return results"""

        # Create a response object
        class MockResponse:
            def __init__(self, data=None):
                self.data = data if data is not None else []

        # If we have filtered data from a query, return that
        if hasattr(self, "filtered_data"):
            data = self.filtered_data[0] if self.filtered_data else None
            del self.filtered_data
            return MockResponse(data)

        # Otherwise return empty result
        return MockResponse()


@lru_cache()
def get_supabase_client() -> Client:
    """Get Supabase client with caching to avoid recreating for each request"""
    if not settings.supabase_url or not settings.supabase_key:
        logger.warning("Missing Supabase credentials, using mock client")
        return MockSupabaseClient()

    try:
        return create_client(settings.supabase_url, settings.supabase_key)
    except Exception as e:
        logger.error(f"Error creating Supabase client: {str(e)}")
        logger.warning("Falling back to mock client due to initialization error")
        return MockSupabaseClient()
