"""Tests for Redis cache client — runs without a real Redis instance."""
import pytest
from app.cache.redis_client import cache_get, cache_set, cache_delete, make_key, _get_client
import os


@pytest.fixture(autouse=True)
def no_redis_url(monkeypatch):
    """Ensure REDIS_URL is unset so all calls gracefully no-op."""
    monkeypatch.delenv("REDIS_URL", raising=False)
    # Reset the init state so each test starts fresh
    import app.cache.redis_client as rc
    rc._client = None
    rc._init_attempted = False
    yield
    rc._client = None
    rc._init_attempted = False


async def test_cache_get_returns_none_without_redis():
    result = await cache_get("test:key")
    assert result is None


async def test_cache_set_does_not_raise_without_redis():
    await cache_set("test:key", {"value": 42}, ttl=60)  # should not raise


async def test_cache_delete_does_not_raise_without_redis():
    await cache_delete("test:key")  # should not raise


def test_make_key_is_deterministic():
    k1 = make_key("ddg", "capital of france")
    k2 = make_key("ddg", "capital of france")
    assert k1 == k2


def test_make_key_differs_for_different_inputs():
    k1 = make_key("ddg", "paris")
    k2 = make_key("ddg", "london")
    assert k1 != k2
