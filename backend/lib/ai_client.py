import openai
import anthropic
from config import get_settings
from typing import Dict, Any, Optional, List

settings = get_settings()

# Initialize API clients
openai.api_key = settings.openai_api_key
anthropic_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)


async def generate_with_openai(
    prompt: str,
    model: str = "gpt-3.5-turbo",
    system_prompt: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: Optional[int] = None,
) -> Dict[str, Any]:
    """Generate text using OpenAI API"""
    messages = []
    
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    
    messages.append({"role": "user", "content": prompt})
    
    response = await openai.ChatCompletion.acreate(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        n=1,
    )
    
    return {
        "id": response.id,
        "content": response.choices[0].message.content,
        "model": model,
        "created_at": response.created,
        "tokens_used": response.usage.total_tokens,
    }


async def generate_with_anthropic(
    prompt: str,
    model: str = "claude-3-haiku",
    system_prompt: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: Optional[int] = None,
) -> Dict[str, Any]:
    """Generate text using Anthropic API"""
    system = system_prompt if system_prompt else "You are a helpful AI assistant."
    
    response = anthropic_client.messages.create(
        model=model,
        max_tokens=max_tokens or 1024,
        temperature=temperature,
        system=system,
        messages=[{"role": "user", "content": prompt}]
    )
    
    return {
        "id": response.id,
        "content": response.content[0].text,
        "model": model,
        "created_at": response.created_at,
        "tokens_used": None,  # Anthropic doesn't return token counts in the same way
    }


async def generate_response(
    prompt: str,
    model: str = "gpt-3.5-turbo",
    system_prompt: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: Optional[int] = None,
) -> Dict[str, Any]:
    """Generate text using the appropriate AI service based on the model"""
    if model.startswith("gpt"):
        return await generate_with_openai(
            prompt=prompt,
            model=model,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )
    elif model.startswith("claude"):
        return await generate_with_anthropic(
            prompt=prompt,
            model=model,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )
    else:
        raise ValueError(f"Unsupported model: {model}")