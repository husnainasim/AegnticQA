"""Data access layer — all methods silently skip when DB is unavailable."""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger("agentic_qa")


async def save_conversation(
    *,
    request_id: str,
    session_id: str | None,
    user_id: str | None,
    query: str,
    answer: str,
    cost_usd: float,
    prompt_tokens: int,
    completion_tokens: int,
    latency_ms: int,
    tools_called: list[str],
    iterations: int,
) -> None:
    from app.db.session import get_session
    from app.db.models import Conversation

    async with get_session() as session:
        if session is None:
            return
        try:
            conv = Conversation(
                request_id=request_id,
                session_id=session_id,
                user_id=user_id,
                query=query,
                answer=answer,
                cost_usd=cost_usd,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                latency_ms=latency_ms,
                tools_called=tools_called,
                iterations=iterations,
            )
            session.add(conv)
        except Exception as exc:
            logger.warning("save_conversation failed: %s", exc)


async def save_session_messages(session_id: str, messages: list[dict]) -> None:
    from app.db.session import get_session
    from app.db.models import SessionMessage

    async with get_session() as session:
        if session is None:
            return
        try:
            for msg in messages:
                role = msg.get("role", "")
                content = msg.get("content", "")
                if isinstance(content, list):
                    content = json.dumps(content)
                elif not isinstance(content, str):
                    content = str(content)
                session.add(SessionMessage(session_id=session_id, role=role, content=content))
        except Exception as exc:
            logger.warning("save_session_messages failed: %s", exc)


async def load_session_messages(session_id: str, limit: int = 20) -> list[dict]:
    from app.db.session import get_session, _DB_AVAILABLE
    if not _DB_AVAILABLE:
        return []

    from app.db.models import SessionMessage
    from sqlalchemy import select

    async with get_session() as session:
        if session is None:
            return []
        try:
            result = await session.execute(
                select(SessionMessage)
                .where(SessionMessage.session_id == session_id)
                .order_by(SessionMessage.created_at.desc())
                .limit(limit)
            )
            rows = list(reversed(result.scalars().all()))
            return [{"role": r.role, "content": r.content} for r in rows]
        except Exception as exc:
            logger.warning("load_session_messages failed: %s", exc)
            return []


async def save_memory_item(
    *,
    session_id: str | None,
    user_id: str | None,
    content: str,
    memory_type: str = "episodic",
    importance: float = 0.5,
    embedding: list[float] | None = None,
) -> str | None:
    from app.db.session import get_session
    from app.db.models import MemoryItem
    import uuid as _uuid

    async with get_session() as session:
        if session is None:
            return None
        try:
            item = MemoryItem(
                session_id=session_id,
                user_id=user_id,
                content=content,
                memory_type=memory_type,
                importance=importance,
                embedding=json.dumps(embedding) if embedding else None,
            )
            session.add(item)
            return str(item.id)
        except Exception as exc:
            logger.warning("save_memory_item failed: %s", exc)
            return None


async def load_memory_items(
    session_id: str | None,
    user_id: str | None = None,
    limit: int = 50,
) -> list[dict]:
    from app.db.session import get_session, _DB_AVAILABLE
    if not _DB_AVAILABLE:
        return []

    from app.db.models import MemoryItem
    from sqlalchemy import select, or_

    async with get_session() as session:
        if session is None:
            return []
        try:
            conditions = []
            if session_id:
                conditions.append(MemoryItem.session_id == session_id)
            if user_id:
                conditions.append(MemoryItem.user_id == user_id)
            if not conditions:
                return []

            result = await session.execute(
                select(MemoryItem)
                .where(or_(*conditions))
                .order_by(MemoryItem.importance.desc(), MemoryItem.created_at.desc())
                .limit(limit)
            )
            rows = result.scalars().all()
            return [
                {
                    "id": str(r.id),
                    "content": r.content,
                    "memory_type": r.memory_type,
                    "importance": r.importance,
                    "embedding": json.loads(r.embedding) if r.embedding else None,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in rows
            ]
        except Exception as exc:
            logger.warning("load_memory_items failed: %s", exc)
            return []


async def delete_memory_item(memory_id: str, session_id: str) -> bool:
    from app.db.session import get_session
    from app.db.models import MemoryItem
    from sqlalchemy import delete

    async with get_session() as session:
        if session is None:
            return False
        try:
            import uuid
            await session.execute(
                delete(MemoryItem).where(
                    MemoryItem.id == uuid.UUID(memory_id),
                    MemoryItem.session_id == session_id,
                )
            )
            return True
        except Exception as exc:
            logger.warning("delete_memory_item failed: %s", exc)
            return False


async def delete_all_memories(session_id: str) -> int:
    from app.db.session import get_session
    from app.db.models import MemoryItem
    from sqlalchemy import delete

    async with get_session() as session:
        if session is None:
            return 0
        try:
            result = await session.execute(
                delete(MemoryItem).where(MemoryItem.session_id == session_id)
            )
            return result.rowcount
        except Exception as exc:
            logger.warning("delete_all_memories failed: %s", exc)
            return 0
