"""
Chat database model.
Stores conversation history per project as JSONB.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from app.db.session import Base


class Chat(Base):
    """Chat model – one conversation thread per project."""

    __tablename__ = "chats"

    id = Column(PG_UUID(as_uuid=True), primary_key=True,
                default=uuid.uuid4, index=True)
    project_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    history = Column(JSONB, nullable=False, default=list)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="chats")

    def __repr__(self):
        return f"<Chat(id={self.id}, project_id={self.project_id})>"
