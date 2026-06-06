"""Async Redis cache wrapper — silently no-ops when REDIS_URL is unset or Redis is down."""
from __future__ import annotations

import hashlib
import json
import logging
import os
from typing import Any

logger = logging.getLogger("agentic_qa")

_client = None
_init_attempted = False


async def _get_client():
    global _client, _init_attempted
    if _init_attempted:
        return _client
    _init_attempted = True
    url = os.getenv("REDIS_URL", "")
    if not url:
        return None
    try:
        import redis.asyncio as aioredis
        _client = aioredis.from_url(url, decode_responses=True, socket_connect_timeout=2)
        await _client.ping()
        logger.info("Redis connected: %s", url)
    except Exception as exc:
        logger.warning("Redis unavailable — caching disabled: %s", exc)
        _client = None
    return _client


async def cache_get(key: str) -> Any | None:
    r = await _get_client()
    if r is None:
        return None
    try:
        val = await r.get(key)
        return json.loads(val) if val else None
    except Exception:
        return None


async def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    r = await _get_client()
    if r is None:
        return
    try:
        await r.setex(key, ttl, json.dumps(value))
    except Exception:
        pass


async def cache_delete(key: str) -> None:
    r = await _get_client()
    if r is None:
        return
    try:
        await r.delete(key)
    except Exception:
        pass


def make_key(prefix: str, *parts: str) -> str:
    raw = ":".join(parts)
    digest = hashlib.md5(raw.encode()).hexdigest()
    return f"{prefix}:{digest}"
