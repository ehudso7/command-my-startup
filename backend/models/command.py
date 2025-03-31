from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum


class AIModel(str, Enum):
    GPT_3_5 = "gpt-3.5-turbo"
    GPT_4 = "gpt-4"
    CLAUDE_3_HAIKU = "claude-3-haiku"
    CLAUDE_3_SONNET = "claude-3-sonnet"


class CommandRequest(BaseModel):
    prompt: str = Field(..., description="The command prompt to execute")
    model: AIModel = Field(default=AIModel.GPT_3_5, description="AI model to use")
    system_prompt: Optional[str] = Field(None, description="Optional system prompt for instruction")
    temperature: Optional[float] = Field(0.7, ge=0, le=1, description="Temperature for generation")
    max_tokens: Optional[int] = Field(None, description="Maximum tokens to generate")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context for the command")


class CommandResponse(BaseModel):
    id: str = Field(..., description="Unique identifier for the command execution")
    content: str = Field(..., description="Generated content from the AI model")
    model: str = Field(..., description="Model used for generation")
    created_at: str = Field(..., description="Timestamp of creation")
    tokens_used: Optional[int] = Field(None, description="Number of tokens used")
    
    class Config:
        from_attributes = True