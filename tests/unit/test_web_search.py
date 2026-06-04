import pytest
import respx
import httpx
from app.tools import _registry
from app.tools.web_search import WebSearchTool
from app.agent.policy import PolicyViolation

DDG_SAMPLE = {
    "Abstract": "Paris is the capital city of France.",
    "AbstractURL": "https://en.wikipedia.org/wiki/Paris",
    "AbstractText": "Paris is the capital city of France.",
    "Answer": "",
    "RelatedTopics": [
        {"Text": "Paris - capital of France", "FirstURL": "https://en.wikipedia.org/wiki/Paris"},
        {
            "Name": "Geography",
            "Topics": [
                {"Text": "Ile-de-France region", "FirstURL": "https://en.wikipedia.org/wiki/Ile-de-France"},
            ],
        },
        {"Text": "Eiffel Tower attraction", "FirstURL": "https://en.wikipedia.org/wiki/Eiffel_Tower"},
    ],
}


@pytest.fixture(autouse=True)
def clear_registry():
    _registry.clear()
    yield
    _registry.clear()


@respx.mock
async def test_web_search_returns_results():
    respx.get("https://api.duckduckgo.com/").mock(
        return_value=httpx.Response(200, json=DDG_SAMPLE)
    )
    tool = WebSearchTool()
    result = await tool.run(query="Paris France")
    assert len(result["results"]) > 0
    assert result["query"] == "Paris France"
    assert all("text" in r and "url" in r for r in result["results"])


@respx.mock
async def test_web_search_respects_max_results():
    respx.get("https://api.duckduckgo.com/").mock(
        return_value=httpx.Response(200, json=DDG_SAMPLE)
    )
    tool = WebSearchTool()
    result = await tool.run(query="Paris France", max_results=2)
    assert len(result["results"]) <= 2


@respx.mock
async def test_web_search_handles_disambiguation_topics():
    respx.get("https://api.duckduckgo.com/").mock(
        return_value=httpx.Response(200, json=DDG_SAMPLE)
    )
    tool = WebSearchTool()
    result = await tool.run(query="Paris France")
    urls = [r["url"] for r in result["results"]]
    assert len(urls) >= 1


async def test_policy_violation_blocks_search():
    import os
    os.environ["BLOCKED_DOMAINS"] = "evil.com"
    tool = WebSearchTool()
    with pytest.raises(PolicyViolation):
        await tool.run(query="visit evil.com now")
