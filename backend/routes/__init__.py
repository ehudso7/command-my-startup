from fastapi import APIRouter
from routes.auth import router as auth_router
from routes.commands import router as commands_router
from routes.profile import router as profile_router
from routes.history import router as history_router
from routes.debug import router as debug_router

# Create main API router
api_router = APIRouter(prefix="/api")

# Include all route modules
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(commands_router, prefix="/commands", tags=["Commands"])
api_router.include_router(profile_router, prefix="/profile", tags=["User Profile"])
api_router.include_router(history_router, prefix="/history", tags=["Command History"])
api_router.include_router(debug_router, prefix="/debug", tags=["Debug"])