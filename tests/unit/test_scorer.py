import pytest
from unittest.mock import MagicMock
from app.eval.scorer import score_answer, EvalResult
from app.agent.planner import PlannerResponse
from app.models.response import TokenUsage


@pytest.fixture
def mock_planner_eval():
    planner = MagicMock()

    async def think_side_effect(messages, tools, system):
        return PlannerResponse(
            stop_reason="end_turn",
            content=[{"role": "assistant", "content": '{"groundedness": 4, "relevance": 5, "completeness": 3, "reasoning": "Answer is mostly grounded."}'}],
            tool_calls=[],
            text_response='{"groundedness": 4, "relevance": 5, "completeness": 3, "reasoning": "Answer is mostly grounded."}',
            usage=TokenUsage(prompt=100, completion=30),
        )

    planner.think = think_side_effect
    return planner


async def test_score_returns_eval_result(mock_planner_eval):
    result = await score_answer(
        query="What is the capital of France?",
        answer="Paris is the capital of France.",
        sources=["Wikipedia"],
        planner=mock_planner_eval,
    )
    assert result is not None
    assert isinstance(result, EvalResult)
    assert result.groundedness == 4
    assert result.relevance == 5
    assert result.completeness == 3
    assert result.overall == pytest.approx((4 + 5 + 3) / 3, rel=1e-3)


async def test_score_clamps_values(mock_planner_eval):
    result = await score_answer("q", "a", [], mock_planner_eval)
    assert result is not None
    assert 1 <= result.groundedness <= 5
    assert 1 <= result.relevance <= 5
    assert 1 <= result.completeness <= 5


async def test_score_returns_none_on_bad_json():
    planner = MagicMock()

    async def bad_response(messages, tools, system):
        return PlannerResponse(
            stop_reason="end_turn",
            content=[{"role": "assistant", "content": "not json at all"}],
            tool_calls=[],
            text_response="not json at all",
            usage=TokenUsage(prompt=10, completion=5),
        )

    planner.think = bad_response
    result = await score_answer("q", "a", [], planner)
    assert result is None


def test_eval_result_to_dict():
    er = EvalResult(groundedness=3, relevance=4, completeness=5, reasoning="good", overall=4.0)
    d = er.to_dict()
    assert d["groundedness"] == 3
    assert d["overall"] == 4.0
    assert "reasoning" in d
