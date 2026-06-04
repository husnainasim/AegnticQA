import asyncio
import os
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.tools.base import BaseTool
from app.tools import register, _registry
from app.agent.policy import PolicyEngine

_semaphore: asyncio.Semaphore | None = None


def _get_semaphore() -> asyncio.Semaphore:
    global _semaphore
    if _semaphore is None:
        limit = int(os.getenv("MAX_CONCURRENT_REQUESTS", "5"))
        _semaphore = asyncio.Semaphore(limit)
    return _semaphore


DDG_URL = "https://api.duckduckgo.com/"
_TIMEOUT = httpx.Timeout(10.0, connect=5.0)


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
    reraise=True,
)
async def _fetch_ddg(query: str) -> dict:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.get(DDG_URL, params={"q": query, "format": "json", "no_html": "1"})
        resp.raise_for_status()
        return resp.json()


def _parse_topics(topics: list, max_results: int) -> list[dict]:
    results = []
    for topic in topics:
        if len(results) >= max_results:
            break
        if "Topics" in topic:
            for sub in topic["Topics"]:
                if len(results) >= max_results:
                    break
                text = sub.get("Text", "")
                url = sub.get("FirstURL", "")
                if text and url and PolicyEngine.check_url(url):
                    results.append({"text": text, "url": url})
        else:
            text = topic.get("Text", "")
            url = topic.get("FirstURL", "")
            if text and url and PolicyEngine.check_url(url):
                results.append({"text": text, "url": url})
    return results


class WebSearchTool(BaseTool):
    name = "web_search"
    description = (
        "Search the web using DuckDuckGo. Use for factual questions, current events, "
        "or any topic where external knowledge is needed."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "The search query"},
            "max_results": {
                "type": "integer",
                "description": "Maximum number of results to return (1-10)",
                "default": 5,
                "minimum": 1,
                "maximum": 10,
            },
        },
        "required": ["query"],
    }

    async def run(self, query: str, max_results: int = 5) -> dict:
        PolicyEngine.check_query(query)

        async with _get_semaphore():
            data = await _fetch_ddg(query)

        results: list[dict] = []

        abstract_text = data.get("AbstractText") or data.get("Abstract", "")
        abstract_url = data.get("AbstractURL", "")
        if abstract_text and abstract_url and PolicyEngine.check_url(abstract_url):
            results.append({"text": abstract_text, "url": abstract_url})

        answer = data.get("Answer", "")
        if answer and len(results) < max_results:
            results.append({"text": answer, "url": abstract_url or ""})

        if len(results) < max_results:
            topics = data.get("RelatedTopics", [])
            results.extend(_parse_topics(topics, max_results - len(results)))

        return {"query": query, "results": results[:max_results]}


if "web_search" not in _registry:
    register(WebSearchTool())
