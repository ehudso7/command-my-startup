from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import Dict, Any, Optional, Union
import uuid
from datetime import datetime
import logging

from models.command import CommandRequest, CommandResponse
from lib.ai_client import generate_response
from auth.utils import get_current_user
from middleware import APIKeyUserDependency
from lib.supabase import get_supabase_client

router = APIRouter()
logger = logging.getLogger(__name__)

# Create dependency for authentication via JWT token or API key
api_key_user = APIKeyUserDependency()

async def get_user_from_auth_or_api_key(
    request: Request,
    token_user: Dict[str, Any] = Depends(get_current_user, use_cache=False),
    apikey_user: Dict[str, Any] = Depends(api_key_user, use_cache=False)
) -> Dict[str, Any]:
    """Get user from either JWT token or API key"""
    # Token auth takes precedence
    if token_user:
        request.state.auth_method = "token"
        return token_user
        
    # Fall back to API key auth
    if apikey_user:
        # Already set in middleware
        return apikey_user
        
    # No authentication found
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated"
    )


@router.post("", response_model=CommandResponse)
async def execute_command(
    request: Request,
    command_data: CommandRequest,
    current_user: Dict[str, Any] = Depends(get_user_from_auth_or_api_key)
):
    """Execute an AI command and return the response"""
    try:
        # Log authentication method used
        auth_method = getattr(request.state, "auth_method", "token")
        logger.info(f"Command executed by user {current_user['id']} using {auth_method} authentication")
        
        # Generate response from AI
        ai_response = await generate_response(
            prompt=command_data.prompt,
            model=command_data.model,
            system_prompt=command_data.system_prompt,
            temperature=command_data.temperature,
            max_tokens=command_data.max_tokens
        )
        
        # Create unique identifier for this command execution
        command_id = str(uuid.uuid4())
        
        # Store command execution in Supabase (optional, for history)
        try:
            supabase = get_supabase_client()
            history_entry = {
                "id": command_id,
                "user_id": current_user["id"],
                "prompt": command_data.prompt,
                "model": command_data.model,
                "content": ai_response["content"],
                "tokens_used": ai_response.get("tokens_used"),
                "created_at": datetime.utcnow().isoformat()
            }
            
            # If using API key, store which key was used
            if auth_method == "api_key" and hasattr(request.state, "api_key_id"):
                history_entry["api_key_id"] = request.state.api_key_id
            
            # Store in database
            supabase.table("command_history").insert(history_entry).execute()
        except Exception as e:
            # Log the error but don't fail the request if storage fails
            logger.error(f"Error storing command history: {str(e)}")
        
        # Format and return response
        return CommandResponse(
            id=command_id,
            content=ai_response["content"],
            model=command_data.model,
            created_at=datetime.utcnow().isoformat(),
            tokens_used=ai_response.get("tokens_used")
        )
        
    except Exception as e:
        logger.error(f"Error executing command: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing command: {str(e)}"
        )