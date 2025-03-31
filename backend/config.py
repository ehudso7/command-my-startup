import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App settings
    app_name: str = "Command My Startup API"
    app_version: str = "1.0.0"
    app_description: str = "Backend API for Command My Startup"
    
    # Authentication settings
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "development_secret_key")
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    
    # Database settings (Supabase)
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_key: str = os.getenv("SUPABASE_KEY", "")
    
    # OpenAI settings
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    
    # Anthropic settings
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    
    # Stripe settings
    stripe_api_key: str = os.getenv("STRIPE_API_KEY", "")
    stripe_webhook_secret: str = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    
    # CORS settings
    cors_origins: list = [
        "http://localhost:3000",
        "https://command-my-startup.vercel.app",
    ]
    
    # Environment
    environment: str = os.getenv("ENVIRONMENT", "development")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings():
    """Get cached settings to avoid reading .env file multiple times"""
    return Settings()