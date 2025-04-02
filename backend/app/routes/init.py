from fastapi import APIRouter

from app.routes.auth import router as auth_router
from app.routes.commands import commands_router
from app.routes.debug import router as debug_router
from app.routes.history import router as history_router
from app.routes.profile import router as profile_router

# Create main API router
api_router = APIRouter()

# Include route modules directly

# /api/auth/...
api_router.include_router(auth_router, prefix="/api/auth", tags=["Authentication API"])

# /commands/... (prefix already defined in commands.py)
api_router.include_router(
    commands_router, prefix="/api/commands", tags=["Commands API"]
)

# /api/profile/...
api_router.include_router(
    profile_router, prefix="/api/profile", tags=["User Profile API"]
)

# /api/history/...
api_router.include_router(
    history_router, prefix="/api/history", tags=["Command History API"]
)

# /api/debug/...
api_router.include_router(debug_router, prefix="/api/debug", tags=["Debug API"])

