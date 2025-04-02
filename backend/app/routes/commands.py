from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import logging
from datetime import datetime

from app.auth.jwt import get_current_user, TokenData
from app.lib.ai.openai_client import OpenAIClient
from app.lib.ai.anthropic_client import AnthropicClient
from app.config import settings
from app.lib.supabase.client import get_supabase_client

# Initialize router with prefix
router = APIRouter(prefix="/commands", tags=["Commands"])
logger = logging.getLogger("commands")

# Initialize AI clients
openai_client = OpenAIClient(settings.openai_api_key)
anthropic_client = AnthropicClient(settings.anthropic_api_key)


# Pydantic models
class CommandInput(BaseModel):
    prompt: str
    model: str
    system_prompt: Optional[str] = None
    temperature: Optional[float] = Field(0.7, ge=0, le=1)
    max_tokens: Optional[int] = Field(1024, gt=0, le=4096)


class CommandResponse(BaseModel):
    id: str
    content: str
    model: str
    created_at: str
    tokens_used: Optional[int] = None


class CommandHistory(BaseModel):
    id: str
    prompt: str
    model: str
    created_at: str
    tokens_used: Optional[int] = None


# POST /commands/execute
@router.post("/execute", response_model=CommandResponse)
async def execute_command(
    command: CommandInput, token_data: TokenData = Depends(get_current_user)
):
    """Execute an AI command and store the result"""
    user_id = token_data.sub

    try:
        # Use correct AI client based on model type
        if command.model.startswith(("gpt-", "text-davinci")):
            response = await openai_client.generate(
                prompt=command.prompt,
                model=command.model,
                temperature=command.temperature,
                max_tokens=command.max_tokens,
                system_prompt=command.system_prompt,
            )
        elif command.model.startswith("claude-"):
            response = await anthropic_client.generate(
                prompt=command.prompt,
                model=command.model,
                max_tokens=command.max_tokens,
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported model: {command.model}",
            )

        # Save command in database
        supabase = get_supabase_client()
        command_data = {
            "user_id": user_id,
            "prompt": command.prompt,
            "response": response["content"],
            "model": command.model,
            "tokens_used": response.get("tokens_used"),
        }

        result = supabase.table("commands").insert(command_data).execute()

        if result.data:
            response["id"] = result.data[0]["id"]
        else:
            logger.error(f"Failed to store command for user {user_id}")

        return response

    except Exception as e:
        logger.error(f"Command execution error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to execute command",
        )


# GET /commands
@router.get("", response_model=List[CommandHistory])
async def get_command_history(
    token_data: TokenData = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Get command execution history for the current user"""
    user_id = token_data.sub

    try:
        supabase = get_supabase_client()
        result = (
            supabase.table("commands")
            .select("id, prompt, model, created_at, tokens_used")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .offset(offset)
            .execute()
        )

        if result.error:
            raise Exception(result.error.message)

        return result.data

    except Exception as e:
        logger.error(f"Error fetching command history for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve command history",
        )


# GET /commands/{command_id}
@router.get("/{command_id}", response_model=CommandResponse)
async def get_command_detail(
    command_id: str, token_data: TokenData = Depends(get_current_user)
):
    """Get details of a specific command execution"""
    user_id = token_data.sub

    try:
        supabase = get_supabase_client()
        result = (
            supabase.table("commands")
            .select("id, response, model, created_at, tokens_used")
            .eq("id", command_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Command not found"
            )

        return {
            "id": result.data["id"],
            "content": result.data["response"],
            "model": result.data["model"],
            "created_at": result.data["created_at"],
            "tokens_used": result.data["tokens_used"],
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error fetching command detail {command_id} for user {user_id}: {str(e)}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve command details",
        )


# DELETE /commands/{command_id}
@router.delete("/{command_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_command(
    command_id: str, token_data: TokenData = Depends(get_current_user)
):
    """Delete a command from history"""
    user_id = token_data.sub

    try:
        supabase = get_supabase_client()

        # Verify ownership
        check_result = (
            supabase.table("commands")
            .select("id")
            .eq("id", command_id)
            .eq("user_id", user_id)
            .execute()
        )

        if not check_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Command not found"
            )

        # Perform deletion
        result = (
            supabase.table("commands")
            .delete()
            .eq("id", command_id)
            .eq("user_id", user_id)
            .execute()
        )

        if result.error:
            raise Exception(result.error.message)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error deleting command {command_id} for user {user_id}: {str(e)}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete command",
        )
