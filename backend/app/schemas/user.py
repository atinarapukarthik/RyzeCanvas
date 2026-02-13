"""
Pydantic schemas for User data validation and serialization.
Used for request/response validation in API endpoints.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


# Shared properties
class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr
    full_name: str
    role: str = "user"


# Properties to receive via API on creation
class UserCreate(UserBase):
    """Schema for user registration."""
    password: str


# Properties to receive via API on update
class UserUpdate(BaseModel):
    """Schema for user updates."""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    github_token: Optional[str] = None
    github_username: Optional[str] = None


# Properties to return via API
class UserResponse(UserBase):
    """Schema for user responses (excludes password)."""
    id: int
    is_active: bool
    created_at: datetime
    github_username: Optional[str] = None
    # We generally don't want to return the token to the frontend unless necessary,
    # but for "Connection Status" checks, returning presence might be enough.
    # For now, let's include it so the user can see they have one set, or we can just return a boolean "has_github_token" property if we want to be secure.
    # Given the requirements, I'll add the fields.
    github_token: Optional[str] = None
    
    class Config:
        from_attributes = True  # Enable ORM mode for SQLAlchemy models


# Properties stored in DB
class UserInDB(UserResponse):
    """Complete user schema including hashed password."""
    hashed_password: str
