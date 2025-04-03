from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import jwt
import pytest

from auth.utils import create_access_token
from config import get_settings

settings = get_settings()


def test_create_access_token():
    """Test JWT token creation"""
    # Test data
    user_id = "test-user-123"
    data = {"sub": user_id}

    # Create token
    token = create_access_token(data)

    # Decode token
    decoded = jwt.decode(
        token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
    )

    # Check contents
    assert decoded["sub"] == user_id
    assert "exp" in decoded

    # Test with custom expiration
    custom_expires = timedelta(minutes=60)
    token_with_custom_exp = create_access_token(data, expires_delta=custom_expires)
    decoded_custom = jwt.decode(
        token_with_custom_exp,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
    )

    # Verify expiration is in the future
    now = datetime.utcnow().timestamp()
    assert decoded_custom["exp"] > now
    # Verify it's close to the requested expiration (within 5 seconds)
    expected_exp = (datetime.utcnow() + custom_expires).timestamp()
    assert abs(decoded_custom["exp"] - expected_exp) < 5
