"""
Pydantic schemas for authentication tokens.
"""
from typing import Optional
from pydantic import BaseModel


class Token(BaseModel):
    """Schema for access token response."""
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """Schema for JWT token payload."""
    sub: Optional[int] = None  # User ID
