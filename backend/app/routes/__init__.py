from fastapi import APIRouter
from routes.commands import router as commands_router

api_router = APIRouter()
api_router.include_router(commands_router)
