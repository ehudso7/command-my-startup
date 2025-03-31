from fastapi import Request, Response
from typing import Callable
import time
import logging
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Maximum request body size to log (to avoid oversized logs)
MAX_BODY_LOG_SIZE = 1000


class RequestValidationMiddleware:
    """Middleware for request validation and logging"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, request: Request, call_next: Callable):
        # Generate request ID for tracking
        import uuid
        request_id = str(uuid.uuid4())
        
        # Start timer
        start_time = time.time()
        
        # Log request info
        client_host = request.client.host if request.client else "unknown"
        logger.info(f"Request {request_id}: {request.method} {request.url.path} from {client_host}")
        
        # Log request body for non-GET requests (with size limits)
        if request.method not in ["GET", "HEAD"]:
            try:
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
        
        # Process the request
        try:
            response = await call_next(request)
            
            # Log response time and status
            process_time = time.time() - start_time
            logger.info(
                f"Response {request_id}: {response.status_code} "
                f"processed in {process_time:.4f} seconds"
            )
            
            # Add custom headers for tracking
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = str(process_time)
            
            return response
            
        except Exception as e:
            # Log error
            process_time = time.time() - start_time
            logger.error(
                f"Request {request_id} failed: {str(e)} "
                f"after {process_time:.4f} seconds"
            )
            raise