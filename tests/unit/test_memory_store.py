"""Tests for the in-process memory fallback (no DB required)."""
import pytest
from app.memory.store import MemoryStore, _fallback


@pytest.fixture(autouse=True)
def clear_fallback():
    _fallback.clear()
    yield
    _fallback.clear()


async def test_save_and_retrieve():
    store = MemoryStore()
    await store.save(
        session_id="sess_test",
        user_id=None,
        content="User is based in Pakistan",
        memory_type="semantic",
        importance=0.8,
    )
    items = await store.list_all("sess_test")
    assert len(items) == 1
    assert "Pakistan" in items[0].content


async def test_retrieve_by_similarity():
    store = MemoryStore()
    await store.save(session_id="s1", user_id=None, content="User prefers Celsius", memory_type="preference")
    await store.save(session_id="s1", user_id=None, content="User asked about Lahore", memory_type="episodic")
    results = await store.retrieve("s1", "what temperature unit does the user prefer?", top_k=1)
    assert len(results) == 1
    assert "Celsius" in results[0].content


async def test_forget_removes_item():
    store = MemoryStore()
    await store.save(session_id="s2", user_id=None, content="Temporary fact")
    items = await store.list_all("s2")
    assert len(items) == 1
    mem_id = items[0].id
    await store.forget("s2", mem_id)
    items_after = await store.list_all("s2")
    assert len(items_after) == 0


async def test_forget_all():
    store = MemoryStore()
    for i in range(3):
        await store.save(session_id="s3", user_id=None, content=f"Fact {i}")
    count = await store.forget_all("s3")
    assert count == 3
    assert await store.list_all("s3") == []


async def test_prune_keeps_most_important():
    store = MemoryStore()
    await store.save(session_id="s4", user_id=None, content="Low importance", importance=0.1)
    await store.save(session_id="s4", user_id=None, content="High importance", importance=0.9)
    await store.save(session_id="s4", user_id=None, content="Medium importance", importance=0.5)
    removed = await store.prune("s4", max_items=2)
    assert removed == 1
    remaining = await store.list_all("s4")
    assert len(remaining) == 2
    contents = [m.content for m in remaining]
    assert "Low importance" not in contents
