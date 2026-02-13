"""
Pydantic schemas for Project data validation and serialization.
Used for request/response validation in API endpoints.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# Shared properties
class ProjectBase(BaseModel):
    """Base project schema with common fields."""
    title: str
    description: Optional[str] = None


# Properties to receive via API on creation
class ProjectCreate(ProjectBase):
    """Schema for project creation."""
    code_json: Optional[str] = None  # JSON string
    is_public: bool = False


# Properties to receive via API on update
class ProjectUpdate(BaseModel):
    """Schema for project updates (all fields optional)."""
    title: Optional[str] = None
    description: Optional[str] = None
    code_json: Optional[str] = None
    is_public: Optional[bool] = None


# Properties to return via API
class ProjectResponse(ProjectBase):
    """Schema for project responses."""
    id: int
    user_id: int
    code_json: Optional[str] = None
    is_public: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True  # Enable ORM mode for SQLAlchemy models


# Extended response with owner info (optional, for admin views)
class ProjectResponseWithOwner(ProjectResponse):
    """Schema for project responses with owner details."""
    owner_email: Optional[str] = None
    owner_name: Optional[str] = None


class GithubRepoCreate(BaseModel):
    """Schema for creating a GitHub repository from a project."""
    repo_name: str
    private: bool = False
    description: Optional[str] = None
