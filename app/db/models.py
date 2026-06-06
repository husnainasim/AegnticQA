"""SQLAlchemy ORM models."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger, Column, DateTime, Float, Integer,
    String, Text, ARRAY, Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id = Column(String(64), index=True)
    session_id = Column(String(64), index=True, nullable=True)
    user_id = Column(String(64), nullable=True)
    query = Column(Text, nullable=False)
    answer = Column(Text, nullable=True)
    cost_usd = Column(Float, nullable=True)
    prompt_tokens = Column(Integer, nullable=True)
    completion_tokens = Column(Integer, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    tools_called = Column(ARRAY(String), nullable=True)
    iterations = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now)


class SessionMessage(Base):
    __tablename__ = "session_messages"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    session_id = Column(String(64), nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_now)

    __table_args__ = (
        Index("ix_session_messages_session_created", "session_id", "created_at"),
    )


class MemoryItem(Base):
    __tablename__ = "memory_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(String(64), nullable=True, index=True)
    user_id = Column(String(64), nullable=True, index=True)
    content = Column(Text, nullable=False)
    memory_type = Column(String(20), default="episodic")  # episodic | semantic | preference
    importance = Column(Float, default=0.5)
    embedding = Column(Text, nullable=True)  # JSON-encoded float list
    last_accessed = Column(DateTime(timezone=True), default=_now)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now)
