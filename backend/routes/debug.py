import importlib
import sys
from typing import Any, Dict

from fastapi import APIRouter, HTTPException, status

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return {"status": "ok", "message": "API is running"}


@router.get("/dependencies")
async def get_dependencies():
    """Check installed package versions"""
    dependencies = {
        "fastapi": importlib.import_module("fastapi").__version__,
        "pydantic": importlib.import_module("pydantic").__version__,
        "python": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
    }

    # Check optional packages
    for package in ["openai", "anthropic", "supabase", "prometheus_client"]:
        try:
            module = importlib.import_module(package)
            version = getattr(module, "__version__", "unknown")
            dependencies[package] = version
        except ImportError:
            dependencies[package] = "not installed"

    return {"dependencies": dependencies}


@router.get("/config")
async def get_config():
    """Get redacted configuration"""
    try:
        from config import get_settings

        settings = get_settings()
        # Create a safe version of settings without sensitive values
        safe_settings = {
            "app_name": settings.app_name,
            "app_version": settings.app_version,
            "environment": settings.environment,
            "cors_origins": settings.cors_origins,
            # Include masked versions of sensitive settings
            "openai_api_key": "✓" if settings.openai_api_key else "✗",
            "anthropic_api_key": "✓" if settings.anthropic_api_key else "✗",
            "supabase_url": "✓" if settings.supabase_url else "✗",
            "supabase_key": "✓" if settings.supabase_key else "✗",
            "stripe_api_key": "✓" if settings.stripe_api_key else "✗",
            "jwt_secret_key": "✓" if settings.jwt_secret_key else "✗",
        }

        return {"config": safe_settings}
    except Exception as e:
        return {"error": str(e)}
