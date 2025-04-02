from fastapi import Request, HTTPException
import time
import hashlib
import logging
import asyncio
from redis.asyncio import Redis
from typing import Optional
from backend.app.config import settings

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
    
    async def is_rate_limited(self, key: str, max_requests: int, window: int) -> tuple[bool, int, int]:
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
        requests = [t for t in self.in_memory_store[key]["requests"] if current - t <= window]
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

class RateLimiterMiddleware:
    def __init__(
        self,
        rate_limiter: RateLimiter,
        auth_routes_rpm: int = 20,
        command_routes_rpm: int = 30,
        general_routes_rpm: int = 60,
    ):
        self.rate_limiter = rate_limiter
        self.auth_routes_rpm = auth_routes_rpm
        self.command_routes_rpm = command_routes_rpm
        self.general_routes_rpm = general_routes_rpm
    
    async def __call__(self, request: Request, call_next):
        # Get client identifier (IP + user agent hash or user ID if authenticated)
        client_ip = request.client.host
        user_agent = request.headers.get("user-agent", "")
        identifier = f"{client_ip}:{hashlib.md5(user_agent.encode()).hexdigest()}"
        
        # Try to get authenticated user ID
        user_id = None
        try:
            user_id = request.state.user.id if hasattr(request.state, "user") else None
        except:
            pass
        
        # Use user_id as identifier if available
        if user_id:
            identifier = f"user:{user_id}"
        
        # Determine rate limit based on path
        path = request.url.path
        if path.startswith("/auth"):
            limit = self.auth_routes_rpm
            key = f"ratelimit:auth:{identifier}"
        elif path.startswith("/commands"):
            limit = self.command_routes_rpm
            key = f"ratelimit:commands:{identifier}"
        else:
            limit = self.general_routes_rpm
            key = f"ratelimit:general:{identifier}"
        
        # Check rate limit
        is_limited, current, reset = await self.rate_limiter.is_rate_limited(key, limit, 60)
        
        if is_limited:
            # Make retry-after value safe
            retry_after = max(1, min(3600, reset - int(time.time())))
            
            logger.warning(f"Rate limit exceeded for {identifier} on {path}")
            raise HTTPException(
                status_code=429,
                detail="Too many requests",
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset)
                }
            )
        
        # Process the request
        response = await call_next(request)
        
        # Add rate limit headers to response
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, limit - current))
        response.headers["X-RateLimit-Reset"] = str(reset)
        
        return response
