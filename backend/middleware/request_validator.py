from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from typing import Callable, Dict, Any
import time
import logging
import json
import hashlib

from lib.supabase import get_supabase_client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Maximum request body size to log (to avoid oversized logs)
MAX_BODY_LOG_SIZE = 1000


class RequestValidationMiddleware:
    """Middleware for request validation and logging"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        """
        ASGI-compatible middleware implementation.
        Takes three parameters: scope, receive, send as per ASGI spec.
        """
        if scope["type"] != "http":
            # Pass through non-HTTP requests (like websockets) directly
            await self.app(scope, receive, send)
            return

        # Build request object
        from fastapi.requests import Request
        request = Request(scope, receive=receive)
        
        # Generate request ID for tracking
        import uuid
        request_id = str(uuid.uuid4())
        
        # Start timer
        start_time = time.time()
        
        # Log request info
        client_host = request.client.host if request.client else "unknown"
        logger.info(f"Request {request_id}: {request.method} {request.url.path} from {client_host}")
        
        # Check for API key authorization if it's a commands endpoint
        if request.url.path.startswith("/api/commands") and "authorization" not in request.headers:
            api_key = request.headers.get("x-api-key")
            if api_key:
                # Validate API key
                api_key_valid, user_id, key_id = await self.validate_api_key(api_key)
                if api_key_valid:
                    # Store user_id in request state for use in the endpoint
                    request.state.user_id = user_id
                    request.state.api_key_id = key_id
                    request.state.auth_method = "api_key"
                    logger.info(f"Request {request_id}: Authenticated via API key")
                else:
                    logger.warning(f"Request {request_id}: Invalid API key")
        
        # Log request body for non-GET requests (with size limits)
        if request.method not in ["GET", "HEAD"]:
            try:
                # We need to clone the receive channel to avoid consuming it
                body = await request.body()
                if len(body) > 0:
                    if len(body) <= MAX_BODY_LOG_SIZE:
                        # Try to parse and log JSON
                        try:
                            body_json = json.loads(body)
                            # Remove sensitive fields
                            if "password" in body_json:
                                body_json["password"] = "[REDACTED]"
                            if "api_key" in body_json:
                                body_json["api_key"] = "[REDACTED]"
                            logger.debug(f"Request {request_id} body: {body_json}")
                        except:
                            # If not JSON, log as string with size limit
                            logger.debug(f"Request {request_id} body: {body[:MAX_BODY_LOG_SIZE]}")
                    else:
                        logger.debug(f"Request {request_id} body too large: {len(body)} bytes")
            except Exception as e:
                logger.warning(f"Error reading request body: {str(e)}")
        
        # Process the request with proper ASGI response handling
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                # Store status code for logging
                nonlocal response_status
                response_status = message.get("status", 0)
                
                # Add custom headers for tracking
                headers = message.get("headers", [])
                headers.append((b"X-Request-ID", request_id.encode()))
                process_time = time.time() - start_time
                headers.append((b"X-Process-Time", str(process_time).encode()))
                message["headers"] = headers
                
            if message["type"] == "http.response.body" and message.get("more_body", False) is False:
                # Final response body - log completed request
                process_time = time.time() - start_time
                logger.info(
                    f"Response {request_id}: {response_status} "
                    f"processed in {process_time:.4f} seconds"
                )
                
            await send(message)
        
        try:
            # Store response status for logging (will be updated in send_wrapper)
            response_status = 0
            await self.app(scope, receive, send_wrapper)
                
        except Exception as e:
            # Log error
            process_time = time.time() - start_time
            logger.error(
                f"Request {request_id} failed: {str(e)} "
                f"after {process_time:.4f} seconds"
            )
            
            # Send error response with 500 status
            await send({
                "type": "http.response.start",
                "status": 500,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"X-Request-ID", request_id.encode()),
                ]
            })
            await send({
                "type": "http.response.body",
                "body": json.dumps({
                    "detail": "Internal server error",
                    "request_id": request_id
                }).encode(),
            })
    
    async def validate_api_key(self, api_key: str) -> tuple:
        """Validate an API key and return user ID if valid"""
        try:
            if not api_key.startswith("cms_"):
                return False, None, None
            
            # Hash the API key
            key_hash = hashlib.sha256(api_key.encode()).hexdigest()
            
            # Check in database
            supabase = get_supabase_client()
            response = supabase.table("api_keys").select(
                "id", "user_id"
            ).eq("key_hash", key_hash).single().execute()
            
            if not response.data:
                return False, None, None
            
            # Update last used timestamp
            supabase.table("api_keys").update({
                "last_used_at": supabase.table("api_keys").sql("NOW()")
            }).eq("id", response.data["id"]).execute()
            
            return True, response.data["user_id"], response.data["id"]
            
        except Exception as e:
            logger.error(f"Error validating API key: {str(e)}")
            return False, None, None


class APIKeyUserDependency:
    """Dependency for routes to get the user from an API key"""
    
    async def __call__(self, request: Request) -> Dict[str, Any]:
        if not hasattr(request.state, "user_id") or request.state.auth_method != "api_key":
            return None
            
        # Fetch the user data from database
        try:
            user_id = request.state.user_id
            supabase = get_supabase_client()
            response = supabase.table("users").select("*").eq("id", user_id).single().execute()
            
            if not response.data:
                return None
                
            return response.data
            
        except Exception as e:
            logger.error(f"Error fetching API key user: {str(e)}")
            return None