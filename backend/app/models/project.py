"""
Project database model.
Defines the Project table schema for storing user projects and AI-generated code.
"""
from datetime import datetime
from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base


class Project(Base):
    """Project model for storing user projects with AI-generated code."""
    
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(String, nullable=True)
    code_json = Column(Text, nullable=True)  # Stores JSON as text for SQLite compatibility
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    is_public = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    owner = relationship("User", back_populates="projects")
    
    def __repr__(self):
        return f"<Project(id={self.id}, title={self.title}, user_id={self.user_id})>"
