"""
Pydantic schemas for Chat data validation and serialization.
"""
from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel


class ChatCreate(BaseModel):
    """Schema for creating a new chat thread for a project."""
    project_id: UUID
    history: List[Any] = []


class ChatUpdate(BaseModel):
    """Schema for appending / replacing chat history."""
    history: List[Any]


class ChatResponse(BaseModel):
    """Schema for chat responses."""
    id: UUID
    project_id: UUID
    history: List[Any]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
