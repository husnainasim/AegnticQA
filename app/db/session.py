"""Async SQLAlchemy engine and session factory. Gracefully no-ops when DATABASE_URL is unset."""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

logger = logging.getLogger("agentic_qa")

_engine = None
_async_session_factory = None
_DB_AVAILABLE = False


def init_db() -> None:
    global _engine, _async_session_factory, _DB_AVAILABLE
    url = os.getenv("DATABASE_URL", "")
    if not url:
        logger.info("DATABASE_URL not set — persistence disabled")
        return
    try:
        from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
        from sqlalchemy.orm import sessionmaker

        # asyncpg driver
        async_url = url.replace("postgresql://", "postgresql+asyncpg://").replace(
            "postgres://", "postgresql+asyncpg://"
        )
        _engine = create_async_engine(async_url, pool_size=5, max_overflow=10, echo=False)
        _async_session_factory = sessionmaker(
            _engine, class_=AsyncSession, expire_on_commit=False
        )
        _DB_AVAILABLE = True
        logger.info("Database engine initialised")
    except Exception as exc:
        logger.warning("DB init failed — persistence disabled: %s", exc)


async def create_tables() -> None:
    if not _DB_AVAILABLE or _engine is None:
        return
    try:
        from app.db.models import Base
        async with _engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created/verified")
    except Exception as exc:
        logger.warning("create_tables failed: %s", exc)


@asynccontextmanager
async def get_session() -> AsyncGenerator:
    if not _DB_AVAILABLE or _async_session_factory is None:
        yield None
        return
    async with _async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
