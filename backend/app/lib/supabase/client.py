from pydantic_settings import BaseSettings
from supabase import Client, create_client


class SupabaseSettings(BaseSettings):
    supabase_url: str
    supabase_key: str

    class Config:
        env_file = ".env"


def get_supabase_client() -> Client:
    """Create and return a Supabase client"""
    settings = SupabaseSettings()
    return create_client(settings.supabase_url, settings.supabase_key)
