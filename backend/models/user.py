from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any


class UserBase(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    full_name: str = Field(..., description="User's full name")


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="User password")


class UserLogin(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class UserResponse(UserBase):
    id: str = Field(..., description="User unique identifier")
    created_at: str = Field(..., description="User creation timestamp")
    
    class Config:
        from_attributes = True


class SessionResponse(BaseModel):
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(..., description="Token type, typically 'bearer'")
    expires_in: int = Field(..., description="Token expiration in seconds")
    refresh_token: Optional[str] = Field(None, description="JWT refresh token")
    user: Dict[str, Any] = Field(..., description="User details from Supabase")


class TokenRefresh(BaseModel):
    refresh_token: str = Field(..., description="JWT refresh token")


class TokenResponse(BaseModel):
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(..., description="Token type, typically 'bearer'")
    expires_in: int = Field(..., description="Token expiration in seconds")