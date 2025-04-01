from fastapi import APIRouter
from routes.auth import router as auth_router
from routes.commands import router as commands_router
from routes.profile import router as profile_router
from routes.history import router as history_router
from routes.debug import router as debug_router

# Create main API router
api_router = APIRouter()

# Include route modules with API prefix
auth_api_router = APIRouter(prefix="/api/auth", tags=["Authentication API"])
auth_api_router.include_router(auth_router)

commands_api_router = APIRouter(prefix="/api/commands", tags=["Commands API"])
commands_api_router.include_router(commands_router)

profile_api_router = APIRouter(prefix="/api/profile", tags=["User Profile API"])
profile_api_router.include_router(profile_router)

history_api_router = APIRouter(prefix="/api/history", tags=["Command History API"])
history_api_router.include_router(history_router)

debug_api_router = APIRouter(prefix="/api/debug", tags=["Debug API"])
debug_api_router.include_router(debug_router)

# Include all API routers
api_router.include_router(auth_api_router)
api_router.include_router(commands_api_router)
api_router.include_router(profile_api_router)
api_router.include_router(history_api_router)
api_router.include_router(debug_api_router)

# Include direct routes (without /api prefix)
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])