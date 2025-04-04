import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional
import os
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from app.lib.supabase.client import get_supabase_client
from config import settings

# Constants for token types
ACCESS_TOKEN_TYPE = os.getenv("ACCESS_TOKEN_TYPE", "access")
REFRESH_TOKEN_TYPE = os.getenv("REFRESH_TOKEN_TYPE", "refresh")

# Use 'auth/token' endpoint for token acquisition
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


class TokenData(BaseModel):
    sub: str
    jti: str
    exp: datetime
    iat: datetime = Field(default_factory=datetime.utcnow)
    type: str = ACCESS_TOKEN_TYPE


def create_access_token(
    data: Dict[str, str], expires_delta: Optional[timedelta] = None
) -> str:
    """Create a JWT access token with security enhancements"""
    to_encode = data.copy()

    # Set expiration time
    expire = datetime.utcnow() + (
        expires_delta
        if expires_delta
        else timedelta(minutes=settings.jwt_access_token_expire_minutes)
    )

    # Add additional security claims
    to_encode.update(
        {
            "exp": expire,
            "iat": datetime.utcnow(),
            "jti": str(uuid.uuid4()),  # Add unique token ID
            "type": ACCESS_TOKEN_TYPE,  # Use the constant here
            "aud": settings.jwt_audience,  # Add audience claim
        }
    )

    return jwt.encode(
        to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
    )


def create_refresh_token(data: Dict[str, str]) -> str:
    """Create a JWT refresh token with security enhancements"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.jwt_refresh_token_expire_days)

    to_encode.update(
        {
            "exp": expire,
            "iat": datetime.utcnow(),
            "jti": str(uuid.uuid4()),  # Add unique token ID
            "type": REFRESH_TOKEN_TYPE,  # Use the constant here
            "aud": settings.jwt_audience,  # Add audience claim
        }
    )

    return jwt.encode(
        to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
    )


async def get_current_user(
    request: Request, token: str = Depends(oauth2_scheme)
) -> TokenData:
    """Validate JWT token and return user data"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decode and verify token
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            audience=settings.jwt_audience,
            options={"verify_sub": True},
        )

        # Extract and validate claims
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        jti: str = payload.get("jti")

        if not all([user_id, token_type, jti]):
            raise credentials_exception

        if token_type != ACCESS_TOKEN_TYPE:  # Use the constant here
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )

        # Create token data
        token_data = TokenData(
            sub=user_id,
            jti=jti,
            exp=datetime.fromtimestamp(payload.get("exp")),
            iat=datetime.fromtimestamp(payload.get("iat")),
            type=token_type,
        )

        return token_data

    except JWTError:
        raise credentials_exception

