import pytest
from unittest.mock import MagicMock

from app.agent.planner import PlannerResponse, ToolCallRequest
from app.models.response import TokenUsage


def _make_tool_use_block(tool_id: str, name: str, inputs: dict):
    block = MagicMock()
    block.type = "tool_use"
    block.id = tool_id
    block.name = name
    block.input = inputs
    return block


def _make_text_block(text: str):
    block = MagicMock()
    block.type = "text"
    block.text = text
    return block


@pytest.fixture
def mock_planner_web_search():
    planner = MagicMock()
    tool_block = _make_tool_use_block("tu_001", "web_search", {"query": "Paris capital France"})
    text_block = _make_text_block("Paris is the capital of France. [Source: Wikipedia]")

    call_count = 0

    async def think_side_effect(messages, tools, system):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return PlannerResponse(
                stop_reason="tool_use",
                content=[tool_block],
                tool_calls=[ToolCallRequest(id="tu_001", name="web_search", inputs={"query": "Paris capital France"})],
                text_response=None,
                usage=TokenUsage(prompt=300, completion=40),
            )
        else:
            return PlannerResponse(
                stop_reason="end_turn",
                content=[text_block],
                tool_calls=[],
                text_response="Paris is the capital of France. [Source: Wikipedia]",
                usage=TokenUsage(prompt=450, completion=38),
            )

    planner.think = think_side_effect
    return planner


@pytest.fixture
def mock_planner_weather():
    planner = MagicMock()
    tool_block = _make_tool_use_block("tu_002", "get_weather", {"location": "Paris"})
    text_block = _make_text_block("The weather in Paris is 18 degrees C and cloudy.")

    call_count = 0

    async def think_side_effect(messages, tools, system):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return PlannerResponse(
                stop_reason="tool_use",
                content=[tool_block],
                tool_calls=[ToolCallRequest(id="tu_002", name="get_weather", inputs={"location": "Paris"})],
                text_response=None,
                usage=TokenUsage(prompt=280, completion=35),
            )
        else:
            return PlannerResponse(
                stop_reason="end_turn",
                content=[text_block],
                tool_calls=[],
                text_response="The weather in Paris is 18 degrees C and cloudy.",
                usage=TokenUsage(prompt=400, completion=30),
            )

    planner.think = think_side_effect
    return planner
