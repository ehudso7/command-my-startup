from unittest.mock import AsyncMock, MagicMock, patch

import anthropic
import openai
import pytest

from lib.ai_client import (
    generate_response,
    generate_with_anthropic,
    generate_with_openai,
)


@pytest.mark.asyncio
async def test_generate_with_openai():
    """Test OpenAI generation function"""
    # Mock response from OpenAI
    mock_response = MagicMock()
    mock_response.id = "test-id-123"
    mock_response.created = 1677858242
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "This is a test response"
    mock_response.usage.total_tokens = 50

    # Patch the OpenAI acreate method
    with patch("openai.ChatCompletion.acreate", new_callable=AsyncMock) as mock_acreate:
        mock_acreate.return_value = mock_response

        # Call our function
        result = await generate_with_openai(
            prompt="Test prompt",
            model="gpt-3.5-turbo",
            system_prompt="You are a test assistant",
        )

        # Verify call to OpenAI
        mock_acreate.assert_called_once()
        args, kwargs = mock_acreate.call_args
        assert kwargs["model"] == "gpt-3.5-turbo"
        assert len(kwargs["messages"]) == 2
        assert kwargs["messages"][0]["role"] == "system"
        assert kwargs["messages"][1]["role"] == "user"
        assert kwargs["messages"][1]["content"] == "Test prompt"

        # Verify result
        assert result["id"] == "test-id-123"
        assert result["content"] == "This is a test response"
        assert result["model"] == "gpt-3.5-turbo"
        assert result["created_at"] == 1677858242
        assert result["tokens_used"] == 50


@pytest.mark.asyncio
async def test_generate_with_anthropic():
    """Test Anthropic generation function"""
    # Mock response from Anthropic
    mock_response = MagicMock()
    mock_response.id = "msg_0123456789"
    mock_response.content = [MagicMock()]
    mock_response.content[0].text = "This is a test response from Claude"
    mock_response.created_at = "2023-06-01T12:00:00Z"

    # Patch the Anthropic client
    with patch(
        "anthropic.Anthropic.messages.create", return_value=mock_response
    ) as mock_create:
        # Call our function
        result = await generate_with_anthropic(
            prompt="Test prompt",
            model="claude-3-haiku",
            system_prompt="You are a test assistant",
        )

        # Verify call to Anthropic
        mock_create.assert_called_once()
        args, kwargs = mock_create.call_args
        assert kwargs["model"] == "claude-3-haiku"
        assert kwargs["system"] == "You are a test assistant"
        assert kwargs["messages"][0]["role"] == "user"
        assert kwargs["messages"][0]["content"] == "Test prompt"

        # Verify result
        assert result["id"] == "msg_0123456789"
        assert result["content"] == "This is a test response from Claude"
        assert result["model"] == "claude-3-haiku"
        assert result["created_at"] == "2023-06-01T12:00:00Z"


@pytest.mark.asyncio
async def test_generate_response_openai():
    """Test the combined generate_response function with OpenAI model"""
    with patch(
        "lib.ai_client.generate_with_openai", new_callable=AsyncMock
    ) as mock_openai:
        mock_openai.return_value = {
            "id": "test-id-123",
            "content": "OpenAI response",
            "model": "gpt-3.5-turbo",
            "created_at": 1677858242,
            "tokens_used": 50,
        }

        # Call with OpenAI model
        result = await generate_response(prompt="Test prompt", model="gpt-3.5-turbo")

        # Verify OpenAI function was called
        mock_openai.assert_called_once()

        # Verify result
        assert result["content"] == "OpenAI response"


@pytest.mark.asyncio
async def test_generate_response_anthropic():
    """Test the combined generate_response function with Anthropic model"""
    with patch(
        "lib.ai_client.generate_with_anthropic", new_callable=AsyncMock
    ) as mock_anthropic:
        mock_anthropic.return_value = {
            "id": "msg_0123456789",
            "content": "Claude response",
            "model": "claude-3-haiku",
            "created_at": "2023-06-01T12:00:00Z",
            "tokens_used": None,
        }

        # Call with Anthropic model
        result = await generate_response(prompt="Test prompt", model="claude-3-haiku")

        # Verify Anthropic function was called
        mock_anthropic.assert_called_once()

        # Verify result
        assert result["content"] == "Claude response"


@pytest.mark.asyncio
async def test_generate_response_unsupported_model():
    """Test the generate_response function with unsupported model"""
    with pytest.raises(ValueError) as excinfo:
        await generate_response(prompt="Test prompt", model="unsupported-model")

    assert "Unsupported model" in str(excinfo.value)
