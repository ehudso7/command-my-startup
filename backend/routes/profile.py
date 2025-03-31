from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List, Optional

from models.user import UserBase
from lib.supabase import get_supabase_client
from auth.utils import get_current_user

router = APIRouter()


@router.get("", response_model=Dict[str, Any])
async def get_user_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get the current user's profile"""
    # User is already fetched in the dependency
    return {"profile": current_user}


@router.put("", response_model=Dict[str, Any])
async def update_user_profile(
    profile_data: UserBase,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update the current user's profile"""
    supabase = get_supabase_client()
    
    try:
        # Update user in Supabase
        response = supabase.table("users").update({
            "full_name": profile_data.full_name,
            "email": profile_data.email,
            # Additional profile fields can be added here
        }).eq("id", current_user["id"]).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Return updated profile
        return {"message": "Profile updated successfully", "profile": response.data[0]}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating profile: {str(e)}"
        )


@router.get("/api-keys", response_model=List[Dict[str, Any]])
async def get_api_keys(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get the current user's API keys"""
    supabase = get_supabase_client()
    
    try:
        # Fetch API keys from database
        response = supabase.table("api_keys").select(
            "id", "name", "prefix", "created_at", "last_used_at"
        ).eq("user_id", current_user["id"]).execute()
        
        # Return keys (without the actual key value for security)
        return response.data or []
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching API keys: {str(e)}"
        )


@router.post("/api-keys", response_model=Dict[str, Any])
async def create_api_key(
    name: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new API key for the user"""
    import secrets
    import string
    
    supabase = get_supabase_client()
    
    try:
        # Generate a secure API key
        api_key = "cms_" + ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
        prefix = api_key[:8]  # Store only prefix for reference
        
        # Hash the API key for storage
        import hashlib
        hashed_key = hashlib.sha256(api_key.encode()).hexdigest()
        
        # Store in database
        response = supabase.table("api_keys").insert({
            "user_id": current_user["id"],
            "name": name,
            "prefix": prefix,
            "key_hash": hashed_key,
            "created_at": supabase.table("api_keys").sql("NOW()"),
        }).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create API key"
            )
        
        # Return the generated key (only shown once)
        return {
            "message": "API key created successfully",
            "key": api_key,  # Full key included only in creation response
            "name": name,
            "prefix": prefix,
            "id": response.data[0]["id"]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating API key: {str(e)}"
        )


@router.delete("/api-keys/{key_id}", response_model=Dict[str, Any])
async def delete_api_key(
    key_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete a user's API key"""
    supabase = get_supabase_client()
    
    try:
        # Delete the key
        response = supabase.table("api_keys").delete().eq(
            "id", key_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        return {"message": "API key deleted successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting API key: {str(e)}"
        )