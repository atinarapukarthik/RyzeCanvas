"""
Chat database model.
Stores conversation history per project as JSONB.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Text, String, JSON
from sqlalchemy.orm import relationship
from app.db.session import Base

class Chat(Base):
    """Chat model – one conversation thread per project."""

    __tablename__ = "chats"

    id = Column(String(36), primary_key=True,
                default=lambda: str(uuid.uuid4()), index=True)
    project_id = Column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    history = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="chats")

    def __repr__(self):
        return f"<Chat(id={self.id}, project_id={self.project_id})>"
