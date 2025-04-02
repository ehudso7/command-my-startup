import os
import logging
from typing import List, Optional
from pydantic_settings import BaseSettings
from functools import lru_cache
from dotenv import load_dotenv

# Load .env file if it exists
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    # App settings
    app_name: str = "Command My Startup API"
    app_version: str = "1.0.0"
    app_description: str = "Backend API for Command My Startup"
    
    # Authentication settings
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "")
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = int(os.getenv("JWT_TOKEN_EXPIRE_MINUTES", "30"))
    
    # Database settings (Supabase)
    supabase_url: Optional[str] = os.getenv("SUPABASE_URL", "")
    supabase_key: Optional[str] = os.getenv("SUPABASE_KEY", "")
    
    # OpenAI settings
    openai_api_key: Optional[str] = os.getenv("OPENAI_API_KEY", "")
    
    # Anthropic settings
    anthropic_api_key: Optional[str] = os.getenv("ANTHROPIC_API_KEY", "")
    
    # Stripe settings
    stripe_api_key: Optional[str] = os.getenv("STRIPE_API_KEY", "")
    stripe_webhook_secret: Optional[str] = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    
    # Redis settings for rate limiting
    redis_url: Optional[str] = os.getenv("REDIS_URL", "")
    
    # Rate limiting settings (requests per minute)
    rate_limit_auth: int = int(os.getenv("RATE_LIMIT_AUTH", "20"))
    rate_limit_command: int = int(os.getenv("RATE_LIMIT_COMMAND", "30"))
    rate_limit_general: int = int(os.getenv("RATE_LIMIT_GENERAL", "60"))
    
    # CORS settings
    cors_origins: List[str] = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else [
        "http://localhost:3000",
        "https://command-my-startup.vercel.app",
        "https://www.commandmystartup.com",
        "https://commandmystartup.com",
    ]
    
    # Environment
    environment: str = os.getenv("ENVIRONMENT", "development")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        validate_assignment = True

    def log_config(self):
        """Log configuration status"""
        config_status = {
            "Environment": self.environment,
            "JWT Secret Key": "✓" if self.jwt_secret_key else "✗",
            "Supabase URL": "✓" if self.supabase_url else "✗",
            "Supabase Key": "✓" if self.supabase_key else "✗",
            "OpenAI API Key": "✓" if self.openai_api_key else "✗",
            "Anthropic API Key": "✓" if self.anthropic_api_key else "✗",
            "Stripe API Key": "✓" if self.stripe_api_key else "✗",
            "Redis URL": "✓" if self.redis_url else "✗",
        }
        
        logger.info("Configuration loaded:")
        for key, value in config_status.items():
            logger.info(f"  {key}: {value}")
            
        logger.info(f"Rate limits (rpm): Auth={self.rate_limit_auth}, Command={self.rate_limit_command}, General={self.rate_limit_general}")
        
        # Security checks for production environment
        if self.environment == "production":
            missing_keys = []
            
            if not self.jwt_secret_key:
                missing_keys.append("JWT_SECRET_KEY")
                
            if not self.supabase_url or not self.supabase_key:
                missing_keys.append("SUPABASE_URL and/or SUPABASE_KEY")
                
            if not self.openai_api_key and not self.anthropic_api_key:
                missing_keys.append("OPENAI_API_KEY and/or ANTHROPIC_API_KEY")
                
            if missing_keys:
                error_message = f"CRITICAL SECURITY ERROR: Missing required environment variables in production: {', '.join(missing_keys)}"
                logger.critical(error_message)
                raise ValueError(error_message)


@lru_cache()
def get_settings():
    """Get cached settings to avoid reading .env file multiple times"""
    settings = Settings()
    settings.log_config()
    return settings

# ✅ This is the missing piece
settings = get_settings()

