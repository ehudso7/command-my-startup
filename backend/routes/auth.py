from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict, Any

from models.user import UserCreate, UserLogin, SessionResponse
from lib.supabase import get_supabase_client
from auth.utils import create_access_token
from config import get_settings

router = APIRouter()
settings = get_settings()


@router.post("/register", response_model=Dict[str, Any])
async def register_user(user_data: UserCreate):
    """Register a new user in Supabase"""
    supabase = get_supabase_client()
    
    try:
        # Create user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
            "options": {
                "data": {
                    "full_name": user_data.full_name
                }
            }
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )
        
        # Return success response with user data
        return {
            "message": "User registered successfully",
            "user": auth_response.user
        }
        
    except Exception as e:
        error_msg = str(e)
        
        if "already registered" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {error_msg}"
        )


@router.post("/login", response_model=Dict[str, Any])
async def login_user(login_data: UserLogin):
    """Log in a user and return session data"""
    supabase = get_supabase_client()
    
    try:
        # Sign in user with Supabase Auth
        auth_response = supabase.auth.sign_in_with_password({
            "email": login_data.email,
            "password": login_data.password
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid credentials"
            )
        
        # Return success response with session data
        return {
            "message": "Login successful",
            "session": {
                "access_token": auth_response.session.access_token,
                "token_type": "bearer",
                "expires_in": auth_response.session.expires_in,
                "refresh_token": auth_response.session.refresh_token,
                "user": auth_response.user
            },
            "user": auth_response.user
        }
        
    except Exception as e:
        error_msg = str(e)
        
        if "invalid login" in error_msg.lower() or "invalid credentials" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email or password"
            )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error logging in: {error_msg}"
        )