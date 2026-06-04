import pytest
import respx
import httpx
from fastapi.testclient import TestClient

from app.tools import _registry
from app.tools.weather import WeatherTool
from app.tools.web_search import WebSearchTool


@pytest.fixture(autouse=True)
def setup_registry():
    _registry.clear()
    _registry["web_search"] = WebSearchTool()
    _registry["get_weather"] = WeatherTool()
    yield
    _registry.clear()


@pytest.fixture
def patched_app(mock_planner_web_search):
    from app.main import app
    from app.agent.loop import QAService
    app.state.qa_service = QAService(planner=mock_planner_web_search)
    return app


@respx.mock
def test_query_endpoint_returns_structured_response(patched_app):
    respx.get("https://api.duckduckgo.com/").mock(
        return_value=httpx.Response(200, json={
            "AbstractText": "Paris is the capital of France.",
            "AbstractURL": "https://en.wikipedia.org/wiki/Paris",
            "Answer": "",
            "RelatedTopics": [],
        })
    )
    client = TestClient(patched_app)
    resp = client.post("/query", json={"query": "What is the capital of France?"})
    assert resp.status_code == 200
    data = resp.json()
    assert "answer" in data
    assert "sources" in data
    assert "latency_ms" in data
    assert "tokens" in data


def test_health_endpoint(patched_app):
    client = TestClient(patched_app)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_policy_violation_returns_400(patched_app):
    import os
    os.environ["BLOCKED_DOMAINS"] = "evil.com"
    client = TestClient(patched_app)
    resp = client.post("/query", json={"query": "Tell me about evil.com"})
    assert resp.status_code == 400
    assert "error" in resp.json()
