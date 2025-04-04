import logging
import os

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import Counter, Histogram, make_asgi_app

from config import get_settings
from middleware import (RateLimiterMiddleware, RequestValidationMiddleware,
                        http_exception_handler, internal_exception_handler,
                        validation_exception_handler)
from routes import api_router

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
    description=settings.app_description,
)

# Prometheus metrics
REQUEST_COUNT = Counter(
    "http_requests_total", "Total HTTP Requests", ["method", "endpoint", "status_code"]
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds", "HTTP Request Latency", ["method", "endpoint"]
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
    general_routes_rpm=settings.rate_limit_general,
)

# Add request validation middleware
app.add_middleware(RequestValidationMiddleware)

# Add exception handlers
app.add_exception_handler(
    status.HTTP_500_INTERNAL_SERVER_ERROR, internal_exception_handler
)
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
    REQUEST_COUNT.labels(
        method=method, endpoint=path, status_code=response.status_code
    ).inc()

    return response


# Include API routes
app.include_router(api_router)


@app.get("/")
def read_root():
    return {"message": f"Welcome to {settings.app_name}"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


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
            "STRIPE_API_KEY",
        ]

        for var in required_vars:
            if not getattr(settings, var.lower(), None):
                missing_vars.append(var)

        if missing_vars:
            logger.warning(
                f"Missing required environment variables: {', '.join(missing_vars)}"
            )


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup tasks on app shutdown"""
    logger.info(f"Shutting down {settings.app_name}")


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")  # Binding to 0.0.0.0 for Render
    port = int(os.getenv("PORT", 8000))  # Default to 8000 if no PORT environment variable
    uvicorn.run(app, host=host, port=port)

