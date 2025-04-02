import pytest
import os
from unittest.mock import patch

# Set test environment variables
os.environ["ENVIRONMENT"] = "test"
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_KEY"] = "test-api-key"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret"
os.environ["OPENAI_API_KEY"] = "test-openai-key"
os.environ["ANTHROPIC_API_KEY"] = "test-anthropic-key"
os.environ["STRIPE_API_KEY"] = "test-stripe-key"
os.environ["STRIPE_WEBHOOK_SECRET"] = "test-webhook-secret"


# Add fixtures here if needed for multiple tests
@pytest.fixture(scope="function")
def mock_env_vars():
    """Fixture to ensure test environment variables are set"""
    # This is already handled by the imports, but included as a fixture
    # in case tests need to override specific values
    pass
