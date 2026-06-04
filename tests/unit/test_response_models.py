import pytest
from pydantic import ValidationError
from app.models.response import QAResponse, Source, LatencyBreakdown, TokenUsage
from app.models.request import QueryRequest


def test_qa_response_round_trips():
    resp = QAResponse(
        answer="Paris is the capital of France.",
        sources=[Source(name="Wikipedia", url="https://en.wikipedia.org/wiki/Paris")],
        latency_ms=LatencyBreakdown(total=500, by_step={"llm_call_1": 300, "retrieve_1_web_search": 200}),
        tokens=TokenUsage(prompt=100, completion=50),
    )
    data = resp.model_dump()
    assert data["answer"] == "Paris is the capital of France."
    assert data["sources"][0]["url"] == "https://en.wikipedia.org/wiki/Paris"
    assert data["latency_ms"]["total"] == 500
    assert data["tokens"]["prompt"] == 100


def test_source_rejects_invalid_url():
    with pytest.raises(ValidationError):
        Source(name="Bad", url="not-a-url")


def test_query_request_defaults():
    req = QueryRequest(query="test")
    assert req.max_iterations == 5
    assert req.stream is False


def test_query_request_rejects_empty():
    with pytest.raises(ValidationError):
        QueryRequest(query="")


def test_query_request_caps_iterations():
    with pytest.raises(ValidationError):
        QueryRequest(query="test", max_iterations=99)
