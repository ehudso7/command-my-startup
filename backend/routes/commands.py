from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, Optional
import uuid
from datetime import datetime

from models.command import CommandRequest, CommandResponse
from lib.ai_client import generate_response
from auth.utils import get_current_user
from lib.supabase import get_supabase_client

router = APIRouter()


@router.post("", response_model=CommandResponse)
async def execute_command(
    command_data: CommandRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Execute an AI command and return the response"""
    try:
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
            supabase.table("command_history").insert({
                "id": command_id,
                "user_id": current_user["id"],
                "prompt": command_data.prompt,
                "model": command_data.model,
                "content": ai_response["content"],
                "tokens_used": ai_response.get("tokens_used"),
                "created_at": datetime.utcnow().isoformat()
            }).execute()
        except Exception as e:
            # Log the error but don't fail the request if storage fails
            print(f"Error storing command history: {str(e)}")
        
        # Format and return response
        return CommandResponse(
            id=command_id,
            content=ai_response["content"],
            model=command_data.model,
            created_at=datetime.utcnow().isoformat(),
            tokens_used=ai_response.get("tokens_used")
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing command: {str(e)}"
        )