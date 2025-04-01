from supabase import create_client, Client
from functools import lru_cache
import logging
from typing import Optional
from config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Default mock client for development/testing when credentials aren't available
class MockSupabaseClient:
    """Mock Supabase client for development/testing without real credentials"""
    
    def __init__(self):
        logger.warning("Using MockSupabaseClient - no real database operations will be performed")
    
    def table(self, table_name):
        return self
        
    def auth(self):
        return self
    
    def select(self, *args, **kwargs):
        return self
        
    def insert(self, *args, **kwargs):
        return self
        
    def update(self, *args, **kwargs):
        return self
        
    def delete(self, *args, **kwargs):
        return self
        
    def eq(self, *args, **kwargs):
        return self
        
    def execute(self, *args, **kwargs):
        # Return empty data response
        class MockResponse:
            data = []
        return MockResponse()


@lru_cache()
def get_supabase_client() -> Client:
    """Get Supabase client with caching to avoid recreating for each request"""
    if not settings.supabase_url or not settings.supabase_key:
        logger.warning("Missing Supabase credentials, using mock client")
        return MockSupabaseClient()
        
    return create_client(settings.supabase_url, settings.supabase_key)