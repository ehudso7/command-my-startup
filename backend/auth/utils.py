from fastapi import Depends, HTTPException, status, Request, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from datetime import datetime, timedelta
import logging
from typing import Optional, Dict, Any

from config import get_settings
from lib.supabase import get_supabase_client

settings = get_settings()
security = HTTPBearer(auto_error=False)  # Don't auto-error so we can check for cookie as fallback
logger = logging.getLogger(__name__)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a new JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.jwt_access_token_expire_minutes))
    to_encode.update({"exp": expire})
    
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Dict[str, Any]:
    """Decode and verify a JWT token"""
    try:
        # Decode the token
        payload = jwt.decode(
            token, 
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError as e:
        logger.error(f"Error decoding token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    request: Request, 
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session_token: Optional[str] = Cookie(None)
):
    """
    Verify and extract user from JWT token.
    Checks both Authorization header and session_token cookie.
    """
    # Try to get token from either header or cookie
    token = None
    if credentials and credentials.credentials:
        token = credentials.credentials
    elif session_token:
        token = session_token
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # First, try to verify with our own JWT
        try:
            payload = jwt.decode(
                token, 
                settings.jwt_secret_key,
                algorithms=[settings.jwt_algorithm]
            )
            
            # Check token type
            if payload.get("token_type") == "refresh":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Cannot use refresh token for authentication",
                    headers={"WWW-Authenticate": "Bearer"},
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
            supabase = get_supabase_client()
            user = supabase.auth.get_user(token)
            return user.user
        
    except Exception as e:
        logger.error(f"Error authenticating user: {str(e)}")
        
        # Check if token is expired
        try:
            payload = jwt.decode(
                token, 
                settings.jwt_secret_key,
                algorithms=[settings.jwt_algorithm],
                options={"verify_exp": False}
            )
            
            if "exp" in payload and datetime.utcnow().timestamp() > payload["exp"]:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token expired",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        except:
            pass
            
        raise credentials_exception
        

async def get_optional_user(
    request: Request, 
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session_token: Optional[str] = Cookie(None)
):
    """
    Similar to get_current_user but returns None instead of raising an exception
    if the user is not authenticated.
    """
    try:
        return await get_current_user(request, credentials, session_token)
    except HTTPException:
        return None