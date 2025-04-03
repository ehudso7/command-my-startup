import logging
import secrets
import time

from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware

# Set up logger
logger = logging.getLogger("security")


class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Process the request
        response = await call_next(request)

        # Add comprehensive security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers[
            "Strict-Transport-Security"
        ] = "max-age=63072000; includeSubDomains; preload"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers[
            "Permissions-Policy"
        ] = "camera=(), microphone=(), geolocation=(), interest-cohort=()"

        # Set appropriate CSP header based on environment
        csp_value = "default-src 'self'; connect-src 'self' https://*.supabase.co; img-src 'self' data:; script-src 'self'"
        response.headers["Content-Security-Policy"] = csp_value

        # Add cache control headers for API routes
        if request.url.path.startswith("/api/"):
            response.headers[
                "Cache-Control"
            ] = "no-store, no-cache, must-revalidate, max-age=0"

        return response


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Add unique request ID for tracking
        request_id = secrets.token_hex(8)
        request.state.request_id = request_id

        # Process the request
        start_time = time.time()
        try:
            response = await call_next(request)
            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            # Log request details
            process_time = time.time() - start_time
            status_code = getattr(response, "status_code", 500)
            logger.info(
                f"request_id={request_id} method={request.method} path={request.url.path} "
                f"status_code={status_code} duration={process_time:.3f}s"
            )


def setup_security(app: FastAPI, settings):
    # Add Request ID middleware first
    app.add_middleware(RequestIdMiddleware)

    # Add CORS middleware with specific configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
        expose_headers=["X-Request-ID"],
        max_age=86400,  # 24 hours
    )

    # Add security headers middleware
    app.add_middleware(SecurityMiddleware)
