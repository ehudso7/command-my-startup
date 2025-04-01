from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from prometheus_client import Counter, Histogram, make_asgi_app
from routes import api_router
from config import get_settings
from middleware import (
    http_exception_handler, 
    validation_exception_handler, 
    internal_exception_handler,
    RequestValidationMiddleware,
    RateLimiterMiddleware
)
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Get application settings
settings = get_settings()

# Create the FastAPI app
app = FastAPI(
    title=settings.app_name, 
    version=settings.app_version,
    description=settings.app_description
)

# Prometheus metrics
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP Requests',
    ['method', 'endpoint', 'status_code']
)

REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP Request Latency',
    ['method', 'endpoint']
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add rate limiter middleware
app.add_middleware(
    RateLimiterMiddleware,
    auth_routes_rpm=settings.rate_limit_auth,
    command_routes_rpm=settings.rate_limit_command,
    general_routes_rpm=settings.rate_limit_general
)

# Add request validation middleware
app.add_middleware(RequestValidationMiddleware)

# Add exception handlers
app.add_exception_handler(status.HTTP_500_INTERNAL_SERVER_ERROR, internal_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(status.HTTP_404_NOT_FOUND, http_exception_handler)

# Add Prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

@app.middleware("http")
async def monitor_requests(request, call_next):
    method = request.method
    path = request.url.path
    
    # Record request latency
    with REQUEST_LATENCY.labels(method=method, endpoint=path).time():
        response = await call_next(request)
    
    # Count requests
    REQUEST_COUNT.labels(method=method, endpoint=path, status_code=response.status_code).inc()
    
    return response

# Include API routes
app.include_router(api_router)

@app.get("/")
def read_root():
    return {"message": f"Welcome to {settings.app_name}"}

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring and deployment verification"""
    from lib.supabase import get_supabase_client
    import os
    import time
    
    health_data = {
        "status": "ok",
        "timestamp": time.time(),
        "environment": settings.environment,
        "version": settings.app_version,
        "services": {}
    }
    
    # Check Supabase connection
    try:
        supabase = get_supabase_client()
        # Make a simple query
        response = supabase.table("users").select("count(*)", count="exact").execute()
        health_data["services"]["database"] = {
            "status": "ok",
            "message": f"Connected successfully"
        }
    except Exception as e:
        health_data["services"]["database"] = {
            "status": "error",
            "message": str(e)
        }
        health_data["status"] = "degraded"
    
    # Check OpenAI if key exists
    if settings.openai_api_key:
        try:
            import openai
            client = openai.OpenAI(api_key=settings.openai_api_key)
            # Just check if the key seems valid (don't make an actual API call)
            health_data["services"]["openai"] = {
                "status": "configured",
                "message": "API key is configured"
            }
        except Exception as e:
            health_data["services"]["openai"] = {
                "status": "error",
                "message": str(e)
            }
            health_data["status"] = "degraded"
    else:
        health_data["services"]["openai"] = {
            "status": "not_configured",
            "message": "API key not set"
        }
    
    # Check Anthropic if key exists
    if settings.anthropic_api_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
            # Just check if the key seems valid (don't make an actual API call)
            health_data["services"]["anthropic"] = {
                "status": "configured",
                "message": "API key is configured"
            }
        except Exception as e:
            health_data["services"]["anthropic"] = {
                "status": "error",
                "message": str(e)
            }
            health_data["status"] = "degraded"
    else:
        health_data["services"]["anthropic"] = {
            "status": "not_configured",
            "message": "API key not set"
        }
    
    # In non-production environments, return detailed health data
    if settings.environment != "production":
        return health_data
    
    # In production, only return simple status to avoid leaking information
    return {
        "status": health_data["status"],
        "version": settings.app_version
    }

@app.on_event("startup")
async def startup_event():
    """Initialization tasks on app startup"""
    logger.info(f"Starting {settings.app_name} in {settings.environment} mode")
    
    # Validate required environment variables on startup
    missing_vars = []
    if settings.environment == "production":
        required_vars = [
            "JWT_SECRET_KEY",
            "SUPABASE_URL",
            "SUPABASE_KEY",
            "OPENAI_API_KEY",
            "ANTHROPIC_API_KEY",
            "STRIPE_API_KEY"
        ]
        
        for var in required_vars:
            if not getattr(settings, var.lower(), None):
                missing_vars.append(var)
        
        if missing_vars:
            logger.warning(f"Missing required environment variables: {', '.join(missing_vars)}")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup tasks on app shutdown"""
    logger.info(f"Shutting down {settings.app_name}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
