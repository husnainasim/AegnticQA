"""Hybrid memory store: episodic + semantic + preference.

Uses PostgreSQL for persistence (via repository.py) and falls back to an
in-process dict when the DB is unavailable so the service always runs.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Literal

logger = logging.getLogger("agentic_qa")

MemoryType = Literal["episodic", "semantic", "preference"]


@dataclass
class MemoryItem:
    id: str
    content: str
    memory_type: MemoryType
    importance: float
    created_at: str
    session_id: str | None = None
    user_id: str | None = None
    embedding: list[float] | None = None


# In-process fallback store (used when DB is absent)
_fallback: dict[str, list[dict]] = {}  # session_id → list of items


class MemoryStore:
    def __init__(self):
        self._emb = None  # lazy-init

    def _get_embedder(self):
        if self._emb is None:
            from app.memory.embedder import embedder
            self._emb = embedder()
        return self._emb

    async def save(
        self,
        *,
        session_id: str | None,
        user_id: str | None,
        content: str,
        memory_type: MemoryType = "episodic",
        importance: float = 0.5,
    ) -> str | None:
        emb = self._get_embedder().embed(content)
        item_id = await _save_to_db(
            session_id=session_id,
            user_id=user_id,
            content=content,
            memory_type=memory_type,
            importance=importance,
            embedding=emb,
        )
        if item_id is None:
            # fallback
            import uuid
            item_id = str(uuid.uuid4())
            key = session_id or user_id or "anon"
            _fallback.setdefault(key, []).append({
                "id": item_id,
                "content": content,
                "memory_type": memory_type,
                "importance": importance,
                "embedding": emb,
                "created_at": _iso_now(),
                "session_id": session_id,
                "user_id": user_id,
            })
        return item_id

    async def retrieve(
        self,
        session_id: str | None,
        query: str,
        top_k: int = 3,
        user_id: str | None = None,
    ) -> list[MemoryItem]:
        items = await self.list_all(session_id, user_id=user_id)
        if not items:
            return []
        emb = self._get_embedder()
        q_vec = emb.embed(query)
        scored = [
            (emb.similarity(q_vec, item.embedding or []), item)
            for item in items
            if item.embedding
        ]
        scored.sort(key=lambda x: x[0], reverse=True)
        return [item for _, item in scored[:top_k]]

    async def list_all(
        self,
        session_id: str | None,
        user_id: str | None = None,
    ) -> list[MemoryItem]:
        rows = await _load_from_db(session_id=session_id, user_id=user_id)
        if rows:
            return [_row_to_item(r) for r in rows]
        # fallback
        key = session_id or user_id or "anon"
        return [_row_to_item(r) for r in _fallback.get(key, [])]

    async def forget(self, session_id: str, memory_id: str) -> bool:
        from app.db.repository import delete_memory_item
        ok = await delete_memory_item(memory_id, session_id)
        if not ok:
            key = session_id
            _fallback[key] = [
                m for m in _fallback.get(key, []) if m["id"] != memory_id
            ]
        return True

    async def forget_all(self, session_id: str) -> int:
        from app.db.repository import delete_all_memories
        count = await delete_all_memories(session_id)
        removed = len(_fallback.pop(session_id, []))
        return count or removed

    async def prune(self, session_id: str, max_items: int = 100) -> int:
        items = await self.list_all(session_id)
        if len(items) <= max_items:
            return 0
        # Remove lowest-importance items beyond limit
        items_sorted = sorted(items, key=lambda x: x.importance)
        to_remove = items_sorted[:len(items) - max_items]
        for item in to_remove:
            await self.forget(session_id, item.id)
        return len(to_remove)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _save_to_db(**kwargs) -> str | None:
    try:
        from app.db.repository import save_memory_item
        return await save_memory_item(**kwargs)
    except Exception as exc:
        logger.debug("Memory DB save failed: %s", exc)
        return None


async def _load_from_db(session_id, user_id=None) -> list[dict]:
    try:
        from app.db.repository import load_memory_items
        return await load_memory_items(session_id=session_id, user_id=user_id)
    except Exception:
        return []


def _row_to_item(r: dict) -> MemoryItem:
    return MemoryItem(
        id=r["id"],
        content=r["content"],
        memory_type=r.get("memory_type", "episodic"),
        importance=r.get("importance", 0.5),
        created_at=r.get("created_at", ""),
        embedding=r.get("embedding"),
    )


def _iso_now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


_store = MemoryStore()


def get_store() -> MemoryStore:
    return _store
