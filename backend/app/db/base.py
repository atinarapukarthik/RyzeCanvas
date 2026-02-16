"""
Base model imports for SQLAlchemy.
Import all models here to ensure they're registered with SQLAlchemy metadata.
This is critical for Alembic migrations and relationship resolution.
"""
from app.db.session import Base
from app.models.user import User
from app.models.project import Project
from app.models.chat import Chat

__all__ = ["Base", "User", "Project", "Chat"]
