"""
Pydantic schemas for authentication tokens.
"""
from typing import Optional
from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    """Schema for access token response."""
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """Schema for JWT token payload."""
    sub: Optional[int] = None  # User ID


class ForgotPasswordRequest(BaseModel):
    """Schema for forgot password request."""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Schema for password reset with token."""
    token: str
    new_password: str
