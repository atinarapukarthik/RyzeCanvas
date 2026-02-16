"""
Project database model.
Defines the Project table schema for storing user projects and AI-generated code.
Uses UUID primary keys for cloud-native compatibility with Supabase.
"""
import uuid
from datetime import datetime
from sqlalchemy import Boolean, Column, String, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from app.db.session import Base


class Project(Base):
    """Project model for storing user projects with AI-generated code."""

    __tablename__ = "projects"

    id = Column(PG_UUID(as_uuid=True), primary_key=True,
                default=uuid.uuid4, index=True)
    user_id = Column(Integer, ForeignKey(
        "users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False, index=True)
    description = Column(String, nullable=True)
    code_json = Column(Text, nullable=True)
    is_public = Column(Boolean, default=False, nullable=False)
    provider = Column(String, default="gemini", nullable=True)
    model = Column(String, default="gemini-2.5-flash", nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow, nullable=False)

    # Relationships
    owner = relationship("User", back_populates="projects")
    chats = relationship("Chat", back_populates="project",
                         cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Project(id={self.id}, name={self.name}, user_id={self.user_id})>"
