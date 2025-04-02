from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie, Request
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime, timedelta
import logging

from app.auth.jwt import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    TokenData,
)
from app.config import settings
from app.lib.supabase.client import get_supabase_client
from app.models.user import UserCreate, UserResponse, UserLogin

# Initialize router
router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger("auth")


# Models
class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    refresh_token: str
    user: UserResponse


class RefreshRequest(BaseModel):
    refresh_token: Optional[str] = None


# Routes
@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
async def register(user_data: UserCreate, request: Request):
    """Register a new user"""
    supabase = get_supabase_client()

    # Check if email already exists
    existing_user = (
        supabase.table("users").select("email").eq("email", user_data.email).execute()
    )
    if existing_user.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )

    try:
        # Create user in Supabase Auth
        auth_user = supabase.auth.admin.create_user(
            {
                "email": user_data.email,
                "password": user_data.password,
                "user_metadata": {"full_name": user_data.full_name},
                "email_confirm": True,  # Skip email verification for now
            }
        )

        if auth_user.error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=auth_user.error.message
            )

        user_id = auth_user.user.id

        # Create user profile in database
        profile = {
            "id": user_id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "referral_code": f"REF{user_id[:8].upper()}",
        }

        # Add referral data if provided
        if user_data.referred_by:
            # Verify referral code
            referrer = (
                supabase.table("users")
                .select("id")
                .eq("referral_code", user_data.referred_by)
                .execute()
            )
            if referrer.data:
                profile["referred_by"] = referrer.data[0]["id"]

                # Create referral record
                supabase.table("referrals").insert(
                    {
                        "referrer_id": referrer.data[0]["id"],
                        "referred_email": user_data.email,
                        "referred_user_id": user_id,
                        "status": "completed",
                    }
                ).execute()

        # Create user profile
        user_result = supabase.table("users").insert(profile).execute()

        if not user_result.data:
            # Rollback auth user if profile creation fails
            supabase.auth.admin.delete_user(user_id)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user profile",
            )

        # Return created user
        return UserResponse(
            id=user_id,
            email=user_data.email,
            full_name=user_data.full_name,
            created_at=datetime.now().isoformat(),
        )

    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user",
        )


@router.post("/login", response_model=TokenResponse)
async def login(response: Response, form_data: OAuth2PasswordRequestForm = Depends()):
    """Authenticate user and return tokens"""
    supabase = get_supabase_client()

    try:
        # Authenticate with Supabase
        auth_result = supabase.auth.sign_in_with_password(
            {
                "email": form_data.username,  # OAuth2 form uses username field
                "password": form_data.password,
            }
        )

        if auth_result.error:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
            )

        user = auth_result.user
        session = auth_result.session

        # Create our own tokens
        access_token = create_access_token(
            data={"sub": user.id},
            expires_delta=timedelta(minutes=settings.jwt_access_token_expire_minutes),
        )

        refresh_token = create_refresh_token(data={"sub": user.id})

        # Get user profile
        profile = supabase.table("users").select("*").eq("id", user.id).execute()

        if not profile.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found"
            )

        # Set cookies
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=settings.environment == "production",
            samesite="lax",
            max_age=settings.jwt_access_token_expire_minutes * 60,
        )

        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=settings.environment == "production",
            samesite="lax",
            max_age=settings.jwt_refresh_token_expire_days * 24 * 60 * 60,
        )

        # Return tokens and user info
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.jwt_access_token_expire_minutes * 60,
            refresh_token=refresh_token,
            user=UserResponse(
                id=user.id,
                email=user.email,
                full_name=profile.data[0].get("full_name"),
                created_at=profile.data[0].get("created_at"),
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed",
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    response: Response,
    request: RefreshRequest = None,
    refresh_token: str = Cookie(None),
):
    """Refresh access token"""
    # Get refresh token from request body or cookie
    token = (
        request.refresh_token if request and request.refresh_token else refresh_token
    )

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token required"
        )

    supabase = get_supabase_client()

    try:
        # First try to refresh with Supabase
        auth_result = supabase.auth.refresh_session({"refresh_token": token})

        if auth_result.error:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
            )

        user = auth_result.user
        session = auth_result.session

        # Create our own tokens
        access_token = create_access_token(
            data={"sub": user.id},
            expires_delta=timedelta(minutes=settings.jwt_access_token_expire_minutes),
        )

        refresh_token = create_refresh_token(data={"sub": user.id})

        # Get user profile
        profile = supabase.table("users").select("*").eq("id", user.id).execute()

        if not profile.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found"
            )

        # Set cookies
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=settings.environment == "production",
            samesite="lax",
            max_age=settings.jwt_access_token_expire_minutes * 60,
        )

        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=settings.environment == "production",
            samesite="lax",
            max_age=settings.jwt_refresh_token_expire_days * 24 * 60 * 60,
        )

        # Return tokens and user info
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.jwt_access_token_expire_minutes * 60,
            refresh_token=refresh_token,
            user=UserResponse(
                id=user.id,
                email=user.email,
                full_name=profile.data[0].get("full_name"),
                created_at=profile.data[0].get("created_at"),
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed",
        )


@router.post("/logout")
async def logout(response: Response, token_data: TokenData = Depends(get_current_user)):
    """Logout user and invalidate tokens"""
    try:
        # Clear cookies
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")

        # Invalidate session in Supabase if needed
        supabase = get_supabase_client()
        try:
            supabase.auth.admin.sign_out(token_data.sub)
        except:
            # Don't fail if Supabase session is already invalid
            pass

        return {"message": "Logged out successfully"}
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Logout failed"
        )


@router.post("/reset-password")
async def request_password_reset(email: EmailStr):
    """Request password reset"""
    supabase = get_supabase_client()

    try:
        result = supabase.auth.reset_password_email(email)

        if result.error:
            # Don't expose whether the email exists
            logger.warning(f"Password reset error for {email}: {result.error.message}")

        # Always return success to prevent email enumeration
        return {"message": "Password reset instructions sent if email exists"}
    except Exception as e:
        logger.error(f"Password reset error: {str(e)}")
        # Always return success to prevent email enumeration
        return {"message": "Password reset instructions sent if email exists"}
