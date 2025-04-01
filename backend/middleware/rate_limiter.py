from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime, timedelta
import time
import logging
import hashlib
from typing import Dict, Any, Optional, Tuple

# Import Redis conditionally to allow for environments without it
try:
    from redis import Redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    Redis = None

from config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Try to connect to Redis if available
redis_client = None
if REDIS_AVAILABLE and settings.redis_url:
    try:
        redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
        redis_client.ping()  # Test connection
        logger.info("Connected to Redis for rate limiting")
    except Exception as e:
        logger.warning(f"Failed to connect to Redis: {str(e)}")
        redis_client = None
else:
    logger.warning("Redis URL not provided or Redis not available, using in-memory rate limiting")

# In-memory storage for rate limiting when Redis is not available
in_memory_storage: Dict[str, Dict[str, Any]] = {}


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """Rate limit requests based on IP and/or authenticated user"""
    
    def __init__(
        self, 
        app,
        auth_routes_rpm: int = 20,      # Auth endpoints: requests per minute
        command_routes_rpm: int = 30,   # Command endpoints: requests per minute
        general_routes_rpm: int = 60,   # All other endpoints: requests per minute
    ):
        super().__init__(app)
        self.auth_routes_rpm = auth_routes_rpm
        self.command_routes_rpm = command_routes_rpm
        self.general_routes_rpm = general_routes_rpm
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Get client IP (consider X-Forwarded-For header for proxy setups)
        client_ip = request.client.host if request.client else "unknown"
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Take the first IP in case of multiple proxies
            client_ip = forwarded_for.split(",")[0].strip()
            
        # Get path and determine rate limit
        path = request.url.path
        
        # Determine which rate limit to apply based on the path
        if path.startswith("/api/auth"):
            rpm = self.auth_routes_rpm
            window_key = f"auth:{client_ip}"
        elif path.startswith("/api/commands"):
            rpm = self.command_routes_rpm
            window_key = f"command:{client_ip}"
        else:
            rpm = self.general_routes_rpm
            window_key = f"general:{client_ip}"
            
        # Authenticated users get higher limits
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            # Hash the token to avoid storing sensitive data
            token_hash = hashlib.sha256(auth_header[7:].encode()).hexdigest()[:16]
            window_key = f"{window_key}:{token_hash}"
            rpm = rpm * 2  # Double the limit for authenticated users
            
        # API keys also get higher limits
        api_key = request.headers.get("x-api-key", "")
        if api_key:
            # Hash the API key
            key_hash = hashlib.sha256(api_key.encode()).hexdigest()[:16]
            window_key = f"{window_key}:{key_hash}"
            rpm = rpm * 3  # Triple the limit for API key users
        
        # Check rate limit
        is_limited, remaining, reset_time = self._check_rate_limit(window_key, rpm)
        
        # Set rate limit headers
        response = await call_next(request) if not is_limited else self._rate_limited_response()
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(rpm)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_time)
        
        return response
    
    def _check_rate_limit(self, key: str, limit: int) -> Tuple[bool, int, int]:
        """
        Check if the request should be rate limited
        Returns: (is_limited, remaining, reset_time)
        """
        current_time = int(time.time())
        window_size = 60  # 1 minute window
        window_start = current_time - (current_time % window_size)
        window_key = f"{key}:{window_start}"
        window_expiry = window_start + window_size
        
        # Use Redis if available
        if REDIS_AVAILABLE and redis_client:
            try:
                # Increment counter for this window
                count = redis_client.incr(window_key)
                
                # Set expiry if new key
                if count == 1:
                    redis_client.expireat(window_key, window_expiry + 10)  # Add buffer
                
                # Check if over limit
                remaining = max(0, limit - count)
                return count > limit, remaining, window_expiry
            except Exception as e:
                logger.error(f"Redis error: {str(e)}")
                # Fall back to in-memory
                
        # In-memory rate limiting
        if window_key not in in_memory_storage:
            in_memory_storage[window_key] = {"count": 1, "expiry": window_expiry}
            
            # Clean expired entries
            for k in list(in_memory_storage.keys()):
                if in_memory_storage[k]["expiry"] < current_time:
                    del in_memory_storage[k]
        else:
            in_memory_storage[window_key]["count"] += 1
            
        count = in_memory_storage[window_key]["count"]
        remaining = max(0, limit - count)
        return count > limit, remaining, window_expiry
    
    def _rate_limited_response(self) -> JSONResponse:
        """Create a rate limit exceeded response"""
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": {
                    "status_code": status.HTTP_429_TOO_MANY_REQUESTS,
                    "message": "Rate limit exceeded. Please try again later.",
                    "type": "rate_limit_error"
                }
            },
            headers={"Retry-After": "60"}
        )