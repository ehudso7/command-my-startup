import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import (APIRouter, Cookie, Depends, HTTPException, Request,
                     Response, status)

from auth.utils import create_access_token, decode_token
from config import get_settings
from lib.supabase import MockSupabaseClient, get_supabase_client
from models.user import SessionResponse, TokenRefresh, UserCreate, UserLogin

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


@router.post("/register", response_model=Dict[str, Any])
async def register_user(user_data: UserCreate):
    """Register a new user in Supabase"""
    supabase = get_supabase_client()

    # Check if we're using the mock client (development/testing)
    if isinstance(supabase, MockSupabaseClient):
        logger.warning("Using mock client for registration - generating mock response")
        # Return a mock successful response
        mock_user = {
            "id": "mock-user-id",
            "email": user_data.email,
            "user_metadata": {"full_name": user_data.full_name},
            "created_at": datetime.utcnow().isoformat(),
        }
        return {"message": "User registered successfully (MOCK)", "user": mock_user}

    try:
        # Create user in Supabase Auth
        auth_response = supabase.auth.sign_up(
            {
                "email": user_data.email,
                "password": user_data.password,
                "options": {"data": {"full_name": user_data.full_name}},
            }
        )

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create user"
            )

        # Return success response with user data
        return {"message": "User registered successfully", "user": auth_response.user}

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Registration error: {error_msg}")

        if "already registered" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {error_msg}",
        )


@router.post("/login", response_model=Dict[str, Any])
async def login_user(login_data: UserLogin, response: Response):
    """Log in a user and return session data"""
    supabase = get_supabase_client()

    # Check if we're using the mock client (development/testing)
    if isinstance(supabase, MockSupabaseClient):
        logger.warning("Using mock client for login - generating mock response")
        # Generate a JWT token using our own implementation
        access_token = create_access_token(
            data={"sub": "mock-user-id", "email": login_data.email},
            expires_delta=timedelta(minutes=settings.jwt_access_token_expire_minutes),
        )

        # Generate a refresh token
        refresh_token = create_access_token(
            data={
                "sub": "mock-user-id",
                "email": login_data.email,
                "token_type": "refresh",
            },
            expires_delta=timedelta(days=7),  # Refresh tokens last longer
        )

        # Set a secure cookie with the token
        cookie_settings = {
            "httponly": True,
            "secure": settings.environment == "production",
            "samesite": "lax",
            "max_age": settings.jwt_access_token_expire_minutes * 60,
        }
        response.set_cookie(key="session_token", value=access_token, **cookie_settings)

        # Set refresh token cookie (longer expiry)
        refresh_cookie_settings = {
            "httponly": True,
            "secure": settings.environment == "production",
            "samesite": "lax",
            "max_age": 7 * 24 * 60 * 60,  # 7 days in seconds
        }
        response.set_cookie(
            key="refresh_token", value=refresh_token, **refresh_cookie_settings
        )

        # Return a mock successful response
        mock_user = {
            "id": "mock-user-id",
            "email": login_data.email,
            "user_metadata": {"full_name": "Mock User"},
        }

        return {
            "message": "Login successful (MOCK)",
            "session": {
                "access_token": access_token,
                "token_type": "bearer",
                "expires_in": settings.jwt_access_token_expire_minutes * 60,
                "refresh_token": refresh_token,
                "user": mock_user,
            },
            "user": mock_user,
        }

    try:
        # Sign in user with Supabase Auth
        auth_response = supabase.auth.sign_in_with_password(
            {"email": login_data.email, "password": login_data.password}
        )

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid credentials"
            )

        # Set a secure cookie with the access token
        cookie_settings = {
            "httponly": True,
            "secure": settings.environment == "production",
            "samesite": "lax",
            "max_age": auth_response.session.expires_in,
        }
        response.set_cookie(
            key="session_token",
            value=auth_response.session.access_token,
            **cookie_settings,
        )

        # Set refresh token cookie
        refresh_cookie_settings = {
            "httponly": True,
            "secure": settings.environment == "production",
            "samesite": "lax",
            "max_age": 7 * 24 * 60 * 60,  # 7 days in seconds
        }
        response.set_cookie(
            key="refresh_token",
            value=auth_response.session.refresh_token,
            **refresh_cookie_settings,
        )

        # Return success response with session data
        return {
            "message": "Login successful",
            "session": {
                "access_token": auth_response.session.access_token,
                "token_type": "bearer",
                "expires_in": auth_response.session.expires_in,
                "refresh_token": auth_response.session.refresh_token,
                "user": auth_response.user,
            },
            "user": auth_response.user,
        }

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Login error: {error_msg}")

        if (
            "invalid login" in error_msg.lower()
            or "invalid credentials" in error_msg.lower()
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email or password",
            )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error logging in: {error_msg}",
        )


@router.post("/logout")
async def logout_user(response: Response):
    """Log out a user by clearing the session cookie"""
    # Clear the session cookie
    response.delete_cookie(
        key="session_token",
        secure=settings.environment == "production",
        httponly=True,
        samesite="lax",
    )

    # Clear the refresh token cookie
    response.delete_cookie(
        key="refresh_token",
        secure=settings.environment == "production",
        httponly=True,
        samesite="lax",
    )

    return {"message": "Logged out successfully"}


@router.post("/refresh", response_model=Dict[str, Any])
async def refresh_token(
    response: Response,
    refresh_token: Optional[str] = Cookie(None, alias="refresh_token"),
    token_data: Optional[TokenRefresh] = None,
):
    """Refresh an access token using a refresh token"""
    # Get the refresh token from either cookie or request body
    token = refresh_token

    # If not in cookie, try to get from request body
    if not token and token_data and token_data.refresh_token:
        token = token_data.refresh_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Refresh token is required"
        )

    supabase = get_supabase_client()

    # Check if we're using the mock client (development/testing)
    if isinstance(supabase, MockSupabaseClient):
        try:
            # Verify the token is a valid refresh token
            payload = decode_token(token)

            if payload.get("token_type") != "refresh":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid refresh token",
                )

            # Generate a new access token
            user_id = payload.get("sub")
            email = payload.get("email")

            new_access_token = create_access_token(
                data={"sub": user_id, "email": email},
                expires_delta=timedelta(
                    minutes=settings.jwt_access_token_expire_minutes
                ),
            )

            # Set the new access token in a cookie
            cookie_settings = {
                "httponly": True,
                "secure": settings.environment == "production",
                "samesite": "lax",
                "max_age": settings.jwt_access_token_expire_minutes * 60,
            }
            response.set_cookie(
                key="session_token", value=new_access_token, **cookie_settings
            )

            # Return success response
            return {
                "message": "Token refreshed successfully (MOCK)",
                "access_token": new_access_token,
                "token_type": "bearer",
                "expires_in": settings.jwt_access_token_expire_minutes * 60,
            }
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Token refresh error (mock): {error_msg}")

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
            )

    try:
        # Refresh token with Supabase Auth
        auth_response = supabase.auth.refresh_session({"refresh_token": token})

        if not auth_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to refresh token",
            )

        # Set the new access token in a cookie
        cookie_settings = {
            "httponly": True,
            "secure": settings.environment == "production",
            "samesite": "lax",
            "max_age": auth_response.session.expires_in,
        }
        response.set_cookie(
            key="session_token",
            value=auth_response.session.access_token,
            **cookie_settings,
        )

        # Return success response
        return {
            "message": "Token refreshed successfully",
            "access_token": auth_response.session.access_token,
            "token_type": "bearer",
            "expires_in": auth_response.session.expires_in,
        }

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Token refresh error: {error_msg}")

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )
