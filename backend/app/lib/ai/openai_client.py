import openai
from openai import OpenAI
import asyncio
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor


class OpenAIClient:
    def __init__(self, api_key):
        self.client = OpenAI(api_key=api_key)

    async def generate(self, prompt, model="gpt-4o", temperature=0.7, max_tokens=1000):
        """Generate text using OpenAI's API with async support"""
        try:
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as pool:
                response = await loop.run_in_executor(
                    pool,
                    lambda: self.client.chat.completions.create(
                        model=model,
                        messages=[{"role": "user", "content": prompt}],
                        temperature=temperature,
                        max_tokens=max_tokens,
                    ),
                )

            return {
                "id": response.id,
                "content": response.choices[0].message.content,
                "model": model,
                "created_at": datetime.now().isoformat(),
                "tokens_used": response.usage.total_tokens,
            }
        except Exception as e:
            # Implement retry logic with exponential backoff
            raise Exception(f"OpenAI API error: {str(e)}")
