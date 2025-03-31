from supabase import create_client, Client
from functools import lru_cache
from config import get_settings

settings = get_settings()


@lru_cache()
def get_supabase_client() -> Client:
    """Get Supabase client with caching to avoid recreating for each request"""
    return create_client(settings.supabase_url, settings.supabase_key)