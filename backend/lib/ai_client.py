import openai
from openai import OpenAI  # Using synchronous client instead of AsyncOpenAI
import anthropic
import logging
from config import get_settings
from typing import Dict, Any, Optional, List
from datetime import datetime

settings = get_settings()
logger = logging.getLogger(__name__)

# Initialize API clients if credentials are available
try:
    if settings.openai_api_key:
        openai_client = OpenAI(api_key=settings.openai_api_key)
    else:
        openai_client = None
        logger.warning("OpenAI API key not found, using mock responses")
except Exception as e:
    openai_client = None
    logger.error(f"Error initializing OpenAI client: {str(e)}")

try:
    if settings.anthropic_api_key:
        anthropic_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    else:
        anthropic_client = None
        logger.warning("Anthropic API key not found, using mock responses")
except Exception as e:
    anthropic_client = None
    logger.error(f"Error initializing Anthropic client: {str(e)}")


async def generate_with_openai(
    prompt: str,
    model: str = "gpt-3.5-turbo",
    system_prompt: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: Optional[int] = None,
) -> Dict[str, Any]:
    """Generate text using OpenAI API"""
    # Use mock response if OpenAI client is not available
    if openai_client is None:
        logger.info(f"Using mock OpenAI response for prompt: {prompt[:30]}...")
        import uuid
        
        # Create a simple mock response
        return {
            "id": f"mockid-{uuid.uuid4()}",
            "content": f"This is a mock response for debugging. Your prompt was: {prompt[:50]}...",
            "model": model,
            "created_at": datetime.now().isoformat(),
            "tokens_used": 10,
        }
    
    # Real API call if client is available
    messages = []
    
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    
    messages.append({"role": "user", "content": prompt})
    
    try:
        # Run the synchronous client in a thread pool to make it async-compatible
        import asyncio
        from concurrent.futures import ThreadPoolExecutor
        
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as pool:
            response = await loop.run_in_executor(
                pool,
                lambda: openai_client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    n=1,
                )
            )
        
        return {
            "id": response.id,
            "content": response.choices[0].message.content,
            "model": model,
            "created_at": datetime.now().isoformat(),
            "tokens_used": response.usage.total_tokens,
        }
    except Exception as e:
        logger.error(f"Error calling OpenAI API: {str(e)}")
        # Fallback to mock response
        import uuid
        return {
            "id": f"error-{uuid.uuid4()}",
            "content": f"Error generating response: {str(e)}",
            "model": model,
            "created_at": datetime.now().isoformat(),
            "tokens_used": 0,
        }


async def generate_with_anthropic(
    prompt: str,
    model: str = "claude-3-haiku",
    system_prompt: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: Optional[int] = None,
) -> Dict[str, Any]:
    """Generate text using Anthropic API"""
    # Use mock response if Anthropic client is not available
    if anthropic_client is None:
        logger.info(f"Using mock Anthropic response for prompt: {prompt[:30]}...")
        from datetime import datetime
        import uuid
        
        # Create a simple mock response
        return {
            "id": f"mockid-{uuid.uuid4()}",
            "content": f"This is a mock Claude response for debugging. Your prompt was: {prompt[:50]}...",
            "model": model,
            "created_at": datetime.now().isoformat(),
            "tokens_used": None,
        }
    
    # Real API call if client is available
    system = system_prompt if system_prompt else "You are a helpful AI assistant."
    
    try:
        # Anthropic client doesn't have async methods, run in a separate thread
        import asyncio
        from concurrent.futures import ThreadPoolExecutor
        
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as pool:
            response = await loop.run_in_executor(
                pool,
                lambda: anthropic_client.messages.create(
                    model=model,
                    max_tokens=max_tokens or 1024,
                    temperature=temperature,
                    system=system,
                    messages=[{"role": "user", "content": prompt}]
                )
            )
        
        return {
            "id": response.id,
            "content": response.content[0].text,
            "model": model,
            "created_at": response.created_at,
            "tokens_used": response.usage.input_tokens + response.usage.output_tokens if hasattr(response, 'usage') else None,
        }
    except Exception as e:
        logger.error(f"Error calling Anthropic API: {str(e)}")
        # Fallback to mock response
        return {
            "id": f"error-{uuid.uuid4()}",
            "content": f"Error generating response: {str(e)}",
            "model": model,
            "created_at": datetime.now().isoformat(),
            "tokens_used": None,
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