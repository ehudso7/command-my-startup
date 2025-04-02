import asyncio
import hashlib
import logging
import time
from typing import Optional

from fastapi import HTTPException, Request
from redis.asyncio import Redis
import os

from app.config import settings

logger = logging.getLogger("rate_limiter")


class RateLimiter:
    def __init__(self, redis_url: Optional[str] = None):
        """Initialize the rate limiter with optional Redis connection"""
        self.redis = None
        self.in_memory_store = {}

        if redis_url:
            try:
                self.redis = Redis.from_url(redis_url, decode_responses=True)
                logger.info("Rate limiter using Redis")
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {str(e)}")
                logger.info("Falling back to in-memory rate limiting")

    async def is_rate_limited(
        self, key: str, max_requests: int, window: int
    ) -> tuple[bool, int, int]:
        """
        Check if request should be rate limited
        Returns: (is_limited, current_count, reset_time)
        """
        current = time.time()

        # Use Redis if available
        if self.redis:
            try:
                # Use pipeline for atomic operations
                async with self.redis.pipeline() as pipe:
                    # Get current count
                    current_count = await self.redis.get(key)

                    if current_count is None:
                        await pipe.set(key, 1, ex=window)
                        await pipe.execute()
                        return False, 1, int(current + window)

                    current_count = int(current_count)

                    # Check if over limit
                    if current_count >= max_requests:
                        # Get TTL for reset time
                        ttl = await self.redis.ttl(key)
                        reset_time = int(current + ttl)
                        return True, current_count, reset_time

                    # Increment and allow
                    await pipe.incr(key)
                    ttl = await self.redis.ttl(key)
                    await pipe.execute()

                    return False, current_count + 1, int(current + ttl)
            except Exception as e:
                logger.error(f"Redis error in rate limiter: {str(e)}")
                # Fall back to in-memory on Redis error

        # In-memory implementation (sliding window)
        if key not in self.in_memory_store:
            self.in_memory_store[key] = {"requests": [current], "window_start": current}
            return False, 1, int(current + window)

        # Clean old requests outside the window
        requests = [
            t for t in self.in_memory_store[key]["requests"] if current - t <= window
        ]
        self.in_memory_store[key]["requests"] = requests

        # Update window start time if needed
        if not requests:
            self.in_memory_store[key]["window_start"] = current

        # Check if over limit
        if len(requests) >= max_requests:
            oldest_request = min(requests) if requests else current
            reset_time = int(oldest_request + window)
            return True, len(requests), reset_time

        # Add current request and allow
        requests.append(current)
        self.in_memory_store[key]["requests"] = requests

        return False, len(requests), int(current + window)

