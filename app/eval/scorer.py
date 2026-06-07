"""LLM-as-judge eval scorer. Uses the existing Groq planner — no external eval service needed."""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass

logger = logging.getLogger("agentic_qa")

_EVAL_PROMPT = """\
You are an impartial evaluator. Rate the answer below on three dimensions.

Query: {query}
Answer: {answer}
Sources/tools used: {sources}

Respond ONLY with valid JSON (no markdown, no explanation outside JSON):
{{
  "groundedness": <int 1-5>,
  "relevance": <int 1-5>,
  "completeness": <int 1-5>,
  "reasoning": "<one sentence>"
}}

Groundedness: Is the answer supported by the tools/sources used? (1=hallucinated, 5=fully grounded)
Relevance: Does the answer address the original query? (1=off-topic, 5=directly answers)
Completeness: Is the answer thorough given available information? (1=incomplete, 5=complete)

IMPORTANT: If the answer contains phrases like "I was unable to find", "I don't know", "I cannot", "no results", or "I am unable", assign groundedness=1 and completeness=1 — no useful information was provided regardless of whether it avoided hallucination.
"""


@dataclass
class EvalResult:
    groundedness: int
    relevance: int
    completeness: int
    reasoning: str
    overall: float

    def to_dict(self) -> dict:
        return {
            "groundedness": self.groundedness,
            "relevance": self.relevance,
            "completeness": self.completeness,
            "reasoning": self.reasoning,
            "overall": self.overall,
        }


async def score_answer(
    query: str,
    answer: str,
    sources: list[str],
    planner,
) -> EvalResult | None:
    prompt = _EVAL_PROMPT.format(
        query=query,
        answer=answer,
        sources=", ".join(sources) if sources else "none",
    )
    try:
        from app.agent.planner import PlannerResponse
        resp: PlannerResponse = await planner.think(
            messages=[{"role": "user", "content": prompt}],
            tools=[],
            system="You are an evaluation assistant. Respond only with JSON.",
        )
        raw = resp.text_response or ""
        # Strip markdown code fences if present
        raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        data = json.loads(raw)
        g = max(1, min(5, int(data.get("groundedness", 3))))
        r = max(1, min(5, int(data.get("relevance", 3))))
        c = max(1, min(5, int(data.get("completeness", 3))))
        overall = round((g + r + c) / 3, 2)
        return EvalResult(
            groundedness=g,
            relevance=r,
            completeness=c,
            reasoning=str(data.get("reasoning", "")),
            overall=overall,
        )
    except Exception as exc:
        logger.warning("Eval scoring failed: %s", exc)
        return None


def push_to_langfuse(
    trace_id: str,
    eval_result: EvalResult,
    langfuse_client=None,
) -> None:
    if langfuse_client is None:
        return
    try:
        langfuse_client.score(
            trace_id=trace_id,
            name="groundedness",
            value=eval_result.groundedness,
        )
        langfuse_client.score(
            trace_id=trace_id,
            name="relevance",
            value=eval_result.relevance,
        )
        langfuse_client.score(
            trace_id=trace_id,
            name="completeness",
            value=eval_result.completeness,
        )
        langfuse_client.score(
            trace_id=trace_id,
            name="overall",
            value=eval_result.overall,
        )
    except Exception as exc:
        logger.debug("Langfuse score push failed: %s", exc)
