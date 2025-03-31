from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from config import get_settings
from lib.supabase import get_supabase_client

settings = get_settings()
security = HTTPBearer()


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a new JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.jwt_access_token_expire_minutes))
    to_encode.update({"exp": expire})
    
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify and extract user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # First, try to verify with our own JWT
        payload = jwt.decode(
            credentials.credentials, 
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        
        # Get user details from Supabase
        supabase = get_supabase_client()
        user_response = supabase.table("users").select("*").eq("id", user_id).single().execute()
        
        if not user_response.data:
            raise credentials_exception
            
        return user_response.data
        
    except JWTError:
        # If our JWT verification fails, try with Supabase token
        try:
            supabase = get_supabase_client()
            user = supabase.auth.get_user(credentials.credentials)
            return user.user
        except Exception:
            raise credentials_exception