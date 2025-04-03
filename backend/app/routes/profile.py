import logging
import secrets
import string
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field

from app.auth.jwt import TokenData, get_current_user
from app.lib.supabase.client import get_supabase_client

# Initialize router
router = APIRouter(prefix="/profile", tags=["Profile"])
logger = logging.getLogger("profile")


# Models
class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class ProfileResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    referral_code: Optional[str] = None
    created_at: str


class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)


class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key: str
    created_at: str
    last_used_at: Optional[str] = None


class ApiKeyInfo(BaseModel):
    id: str
    name: str
    created_at: str
    last_used_at: Optional[str] = None


# Routes
@router.get("", response_model=ProfileResponse)
async def get_profile(token_data: TokenData = Depends(get_current_user)):
    """Get the current user's profile"""
    user_id = token_data.sub

    try:
        supabase = get_supabase_client()
        result = (
            supabase.table("users").select("*").eq("id", user_id).single().execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
            )

        return result.data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching profile for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve profile",
        )


@router.put("", response_model=ProfileResponse)
async def update_profile(
    profile_update: ProfileUpdate, token_data: TokenData = Depends(get_current_user)
):
    """Update the current user's profile"""
    user_id = token_data.sub

    try:
        supabase = get_supabase_client()

        # Update the profile
        result = (
            supabase.table("users")
            .update(profile_update.dict(exclude_unset=True))
            .eq("id", user_id)
            .single()
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
            )

        return result.data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile",
        )


@router.get("/api-keys", response_model=List[ApiKeyInfo])
async def get_api_keys(token_data: TokenData = Depends(get_current_user)):
    """Get the current user's API keys"""
    user_id = token_data.sub

    try:
        supabase = get_supabase_client()
        result = (
            supabase.table("api_keys")
            .select("id, name, created_at, last_used_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )

        return result.data

    except Exception as e:
        logger.error(f"Error fetching API keys for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve API keys",
        )


@router.post(
    "/api-keys", response_model=ApiKeyResponse, status_code=status.HTTP_201_CREATED
)
async def create_api_key(
    api_key_create: ApiKeyCreate, token_data: TokenData = Depends(get_current_user)
):
    """Create a new API key for the current user"""
    user_id = token_data.sub

    try:
        # Generate a secure API key
        alphabet = string.ascii_letters + string.digits
        api_key = "cms_" + "".join(secrets.choice(alphabet) for _ in range(32))

        supabase = get_supabase_client()

        # Count existing keys
        count_result = (
            supabase.table("api_keys")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .execute()
        )

        if count_result.count and count_result.count >= 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum number of API keys reached (5)",
            )

        # Create the API key
        api_key_data = {"user_id": user_id, "name": api_key_create.name, "key": api_key}

        result = supabase.table("api_keys").insert(api_key_data).single().execute()

        if not result.data:
            raise Exception("Failed to create API key")

        return result.data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating API key for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create API key",
        )


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    key_id: str, token_data: TokenData = Depends(get_current_user)
):
    """Delete an API key"""
    user_id = token_data.sub

    try:
        supabase = get_supabase_client()

        # First check if the key exists and belongs to the user
        check_result = (
            supabase.table("api_keys")
            .select("id")
            .eq("id", key_id)
            .eq("user_id", user_id)
            .execute()
        )

        if not check_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="API key not found"
            )

        # Then delete it
        result = (
            supabase.table("api_keys")
            .delete()
            .eq("id", key_id)
            .eq("user_id", user_id)
            .execute()
        )

        if result.error:
            raise Exception(result.error.message)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting API key {key_id} for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete API key",
        )

