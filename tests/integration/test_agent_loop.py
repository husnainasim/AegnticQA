import pytest
import respx
import httpx

from app.agent.loop import QAService
from app.models.request import QueryRequest
from app.tools import _registry
from app.tools.weather import WeatherTool
from app.tools.web_search import WebSearchTool

DDG_SAMPLE = {
    "Abstract": "Paris is the capital city of France.",
    "AbstractURL": "https://en.wikipedia.org/wiki/Paris",
    "AbstractText": "Paris is the capital city of France.",
    "Answer": "",
    "RelatedTopics": [
        {"Text": "Paris - capital of France", "FirstURL": "https://en.wikipedia.org/wiki/Paris"},
    ],
}


@pytest.fixture(autouse=True)
def setup_registry():
    _registry.clear()
    _registry["web_search"] = WebSearchTool()
    _registry["get_weather"] = WeatherTool()
    yield
    _registry.clear()


@respx.mock
async def test_web_search_loop(mock_planner_web_search):
    respx.get("https://api.duckduckgo.com/").mock(
        return_value=httpx.Response(200, json=DDG_SAMPLE)
    )
    service = QAService(planner=mock_planner_web_search)
    request = QueryRequest(query="What is the capital of France?")
    result = await service.run(request)

    assert "Paris" in result.answer
    assert len(result.sources) > 0
    assert result.tokens.prompt == 300 + 450
    assert result.tokens.completion == 40 + 38
    assert "llm_call_1" in result.latency_ms.by_step
    assert "llm_call_2" in result.latency_ms.by_step
    assert result.latency_ms.total > 0


async def test_weather_loop(mock_planner_weather):
    service = QAService(planner=mock_planner_weather)
    request = QueryRequest(query="What is the weather in Paris?")
    result = await service.run(request)

    assert "Paris" in result.answer
    assert result.tokens.prompt == 280 + 400
    assert "llm_call_1" in result.latency_ms.by_step
    assert "retrieve_1_get_weather" in result.latency_ms.by_step


async def test_max_iterations_stops_loop():
    from unittest.mock import MagicMock
    from app.agent.planner import PlannerResponse, ToolCallRequest
    from app.models.response import TokenUsage

    planner = MagicMock()

    async def always_tool_use(messages, tools, system):
        block = MagicMock()
        block.type = "tool_use"
        block.id = "tu_loop"
        block.name = "get_weather"
        block.input = {"location": "Paris"}
        return PlannerResponse(
            stop_reason="tool_use",
            content=[block],
            tool_calls=[ToolCallRequest(id="tu_loop", name="get_weather", inputs={"location": "Paris"})],
            text_response=None,
            usage=TokenUsage(prompt=100, completion=10),
        )

    planner.think = always_tool_use
    service = QAService(planner=planner)
    request = QueryRequest(query="weather loop", max_iterations=2)
    result = await service.run(request)
    assert result.latency_ms.total > 0
