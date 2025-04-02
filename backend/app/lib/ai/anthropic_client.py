import anthropic
from anthropic import Anthropic
import asyncio
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor


class AnthropicClient:
    def __init__(self, api_key):
        self.client = Anthropic(api_key=api_key)

    async def generate(self, prompt, model="claude-3-opus-20240229", max_tokens=1024):
        """Generate text using Anthropic's API with async support"""
        try:
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as pool:
                response = await loop.run_in_executor(
                    pool,
                    lambda: self.client.messages.create(
                        model=model,
                        max_tokens=max_tokens,
                        messages=[{"role": "user", "content": prompt}],
                    ),
                )

            return {
                "id": response.id,
                "content": response.content[0].text,
                "model": model,
                "created_at": datetime.now().isoformat(),
                "tokens_used": response.usage.input_tokens
                + response.usage.output_tokens,
            }
        except Exception as e:
            # Implement retry logic with exponential backoff
            raise Exception(f"Anthropic API error: {str(e)}")
