import pytest
from unittest.mock import MagicMock

from app.agent.planner import PlannerResponse, ToolCallRequest
from app.models.response import TokenUsage


@pytest.fixture
def mock_planner_web_search():
    planner = MagicMock()
    call_count = 0

    async def think_side_effect(messages, tools, system):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            assistant_msg = {
                "role": "assistant",
                "content": "",
                "tool_calls": [
                    {
                        "id": "tu_001",
                        "type": "function",
                        "function": {"name": "web_search", "arguments": '{"query": "Paris capital France"}'},
                    }
                ],
            }
            return PlannerResponse(
                stop_reason="tool_use",
                content=[assistant_msg],
                tool_calls=[ToolCallRequest(id="tu_001", name="web_search", inputs={"query": "Paris capital France"})],
                text_response=None,
                usage=TokenUsage(prompt=300, completion=40),
            )
        else:
            assistant_msg = {
                "role": "assistant",
                "content": "Paris is the capital of France. [Source: Wikipedia]",
            }
            return PlannerResponse(
                stop_reason="end_turn",
                content=[assistant_msg],
                tool_calls=[],
                text_response="Paris is the capital of France. [Source: Wikipedia]",
                usage=TokenUsage(prompt=450, completion=38),
            )

    planner.think = think_side_effect
    return planner


@pytest.fixture
def mock_planner_weather():
    planner = MagicMock()
    call_count = 0

    async def think_side_effect(messages, tools, system):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            assistant_msg = {
                "role": "assistant",
                "content": "",
                "tool_calls": [
                    {
                        "id": "tu_002",
                        "type": "function",
                        "function": {"name": "get_weather", "arguments": '{"location": "Paris"}'},
                    }
                ],
            }
            return PlannerResponse(
                stop_reason="tool_use",
                content=[assistant_msg],
                tool_calls=[ToolCallRequest(id="tu_002", name="get_weather", inputs={"location": "Paris"})],
                text_response=None,
                usage=TokenUsage(prompt=280, completion=35),
            )
        else:
            assistant_msg = {
                "role": "assistant",
                "content": "The weather in Paris is 18 degrees C and cloudy.",
            }
            return PlannerResponse(
                stop_reason="end_turn",
                content=[assistant_msg],
                tool_calls=[],
                text_response="The weather in Paris is 18 degrees C and cloudy.",
                usage=TokenUsage(prompt=400, completion=30),
            )

    planner.think = think_side_effect
    return planner
