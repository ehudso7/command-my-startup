import logging
import traceback
from typing import Union

from fastapi import Request, status
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def http_exception_handler(
    request: Request, exc: Union[HTTPException, StarletteHTTPException]
):
    """Handle HTTP exceptions and return consistent response format"""
    # Log the error
    logger.error(f"HTTP Exception: {exc.detail}")

    # Return consistent error response
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "status_code": exc.status_code,
                "message": exc.detail,
                "type": "http_exception",
            }
        },
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors and return consistent response format"""
    # Log the error
    logger.error(f"Validation Error: {exc.errors()}")

    # Extract error details
    error_details = []
    for error in exc.errors():
        error_details.append(
            {"loc": error["loc"], "msg": error["msg"], "type": error["type"]}
        )

    # Return consistent error response
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY,
                "message": "Validation error",
                "type": "validation_error",
                "details": error_details,
            }
        },
    )


async def internal_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions and return consistent response format"""
    # Generate error ID for tracking
    import uuid

    error_id = str(uuid.uuid4())

    # Log the error with stack trace for debugging
    logger.error(f"Unhandled Exception (ID: {error_id}): {str(exc)}")
    logger.error(traceback.format_exc())

    # Return generic error response to client (without revealing internal details)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                "message": "An unexpected error occurred",
                "type": "server_error",
                "error_id": error_id,  # Include ID for support reference
            }
        },
    )
