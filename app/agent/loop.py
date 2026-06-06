import json
import logging
import time
import uuid
from dataclasses import dataclass, field

from app.agent.planner import Planner
from app.agent.policy import PolicyEngine
from app.agent.guardrails import mask_pii
from app.models.request import QueryRequest
from app.models.response import QAResponse, LatencyBreakdown, Source, TokenUsage
from app.observability.costs import compute_cost
from app.observability.tracer import (
    start_trace, span_llm, end_llm_span,
    span_tool, end_tool_span, end_trace,
)
from app.tools import all_schemas, dispatch

logger = logging.getLogger("agentic_qa")

_MAX_HISTORY_MESSAGES = 20

_SYSTEM_PROMPT = """You are a helpful AI assistant with access to tools.
When answering questions:
1. Decide which tool(s) to use based on the question.
2. Call tools to gather information before answering.
3. After gathering information, provide a clear, cited answer.
4. Always explain which tools you used and why.
5. Cite sources from tool results in your final answer.
For weather questions, use get_weather. For factual/web questions, use web_search.
Be concise and accurate."""


@dataclass
class AgentState:
    messages: list[dict] = field(default_factory=list)
    sources: list[Source] = field(default_factory=list)
    token_prompt: int = 0
    token_completion: int = 0
    step_latencies: dict[str, int] = field(default_factory=dict)
    reasoning_trace: list[str] = field(default_factory=list)
    iteration: int = 0
    tools_called: list[str] = field(default_factory=list)


def _trim_history(messages: list[dict]) -> list[dict]:
    if len(messages) <= _MAX_HISTORY_MESSAGES:
        return messages
    return [messages[0]] + messages[-(_MAX_HISTORY_MESSAGES - 1):]


def _log(event: str, **kwargs):
    record = {"event": event, "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), **kwargs}
    logger.info(json.dumps(record))


class QAService:
    def __init__(self, planner: Planner | None = None):
        self.planner = planner or Planner()

    async def run(self, request: QueryRequest) -> QAResponse:
        request_id = str(uuid.uuid4())
        session_id = request.session_id
        model = self.planner.model

        # --- Safety checks ---
        PolicyEngine.check_query(request.query)
        PolicyEngine.check_injection(request.query)

        # --- PII masking for logs (original query goes to LLM) ---
        masked_query, pii_types = mask_pii(request.query)
        if pii_types:
            _log("pii_detected", request_id=request_id, pii_types=pii_types)

        # --- Load session history from DB ---
        prior_messages = await _load_session_history(session_id)

        # --- Load relevant memories ---
        memories_used: list[str] = []
        system_prompt = _SYSTEM_PROMPT
        if session_id or request.user_id:
            memories_used, system_prompt = await _inject_memories(
                request.query, session_id, request.user_id, _SYSTEM_PROMPT
            )

        # --- Start Langfuse trace ---
        trace = start_trace("qa-request", masked_query, session_id)

        loop_start = time.perf_counter_ns()
        state = AgentState()

        # Seed with prior session messages, then add the new user message
        if prior_messages:
            state.messages.extend(prior_messages)
        state.messages.append({"role": "user", "content": request.query})

        tools = all_schemas()
        answer = "I was unable to complete the request within the iteration limit."

        while state.iteration < request.max_iterations:
            llm_start = time.perf_counter_ns()

            llm_span = span_llm(
                trace, state.iteration + 1, model,
                _trim_history(state.messages), self.planner.max_tokens
            )

            planner_resp = await self.planner.think(
                _trim_history(state.messages), tools, system_prompt
            )

            llm_ms = max(1, (time.perf_counter_ns() - llm_start) // 1_000_000)
            step_key = f"llm_call_{state.iteration + 1}"
            state.step_latencies[step_key] = llm_ms
            state.token_prompt += planner_resp.usage.prompt
            state.token_completion += planner_resp.usage.completion

            end_llm_span(llm_span, planner_resp.text_response or "", {
                "promptTokens": planner_resp.usage.prompt,
                "completionTokens": planner_resp.usage.completion,
            })

            _log(
                "llm_call",
                request_id=request_id,
                iteration=state.iteration + 1,
                stop_reason=planner_resp.stop_reason,
                latency_ms=llm_ms,
                tokens={"prompt": planner_resp.usage.prompt, "completion": planner_resp.usage.completion},
            )

            state.messages.append(planner_resp.content[0])
            state.iteration += 1

            if planner_resp.stop_reason == "end_turn":
                if planner_resp.text_response:
                    answer = planner_resp.text_response
                break

            for tc in planner_resp.tool_calls:
                if tc.name not in state.tools_called:
                    state.tools_called.append(tc.name)

                _log("tool_call_start", request_id=request_id, tool=tc.name,
                     inputs=tc.inputs, iteration=state.iteration)
                retrieve_start = time.perf_counter_ns()
                tool_span = span_tool(trace, tc.name, tc.inputs)

                try:
                    result = await dispatch(tc.name, tc.inputs)
                    retrieve_ms = max(1, (time.perf_counter_ns() - retrieve_start) // 1_000_000)
                    retrieve_key = f"retrieve_{state.iteration}_{tc.name}"
                    state.step_latencies[retrieve_key] = retrieve_ms
                    end_tool_span(tool_span, result)
                    _log("tool_call_end", request_id=request_id, tool=tc.name, latency_ms=retrieve_ms)

                    if tc.name == "web_search" and "results" in result:
                        for r in result["results"]:
                            url = r.get("url", "")
                            text = r.get("text", "")
                            if url and text and url.startswith("http"):
                                try:
                                    state.sources.append(Source(name=text[:80], url=url))
                                except Exception:
                                    pass

                    state.reasoning_trace.append(
                        f"Iteration {state.iteration}: called {tc.name}({json.dumps(tc.inputs)}) -> {json.dumps(result)[:200]}"
                    )
                    state.messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(result),
                    })

                except Exception as exc:
                    retrieve_ms = max(1, (time.perf_counter_ns() - retrieve_start) // 1_000_000)
                    end_tool_span(tool_span, {"error": str(exc)})
                    _log("tool_error", request_id=request_id, tool=tc.name,
                         error=str(exc), latency_ms=retrieve_ms)
                    state.reasoning_trace.append(
                        f"Iteration {state.iteration}: {tc.name} failed - {exc}"
                    )
                    state.messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": f"Tool failed: {exc}",
                    })
        else:
            _log("max_iterations_reached", request_id=request_id, query=masked_query)

        total_ms = max(1, (time.perf_counter_ns() - loop_start) // 1_000_000)
        cost = compute_cost(model, state.token_prompt, state.token_completion)

        _log("request_summary", request_id=request_id, total_ms=total_ms,
             tokens={"prompt": state.token_prompt, "completion": state.token_completion},
             cost_usd=cost, tools_called=state.tools_called, iterations=state.iteration)

        end_trace(trace, answer, {
            "total_ms": total_ms, "cost_usd": cost, "iterations": state.iteration
        })

        # --- Persist to DB ---
        await _persist(
            request_id=request_id,
            session_id=session_id,
            user_id=request.user_id,
            query=request.query,
            answer=answer,
            cost_usd=cost,
            prompt_tokens=state.token_prompt,
            completion_tokens=state.token_completion,
            latency_ms=total_ms,
            tools_called=state.tools_called,
            iterations=state.iteration,
            messages=state.messages,
        )

        # --- Auto-save episodic memory ---
        await _save_episodic_memory(session_id, request.user_id, request.query, answer)

        response = QAResponse(
            answer=answer,
            sources=state.sources,
            latency_ms=LatencyBreakdown(total=total_ms, by_step=state.step_latencies),
            tokens=TokenUsage(prompt=state.token_prompt, completion=state.token_completion),
            reasoning_trace=state.reasoning_trace,
            request_id=request_id,
            cost_usd=cost,
            memories_used=memories_used,
            session_id=session_id,
        )

        # --- Optional inline eval ---
        if request.evaluate:
            response = await _run_eval(response, request.query, self.planner)

        return response


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _load_session_history(session_id: str | None) -> list[dict]:
    if not session_id:
        return []
    try:
        from app.db.repository import load_session_messages
        return await load_session_messages(session_id, limit=_MAX_HISTORY_MESSAGES)
    except Exception:
        return []


async def _inject_memories(
    query: str, session_id: str | None, user_id: str | None, base_prompt: str
) -> tuple[list[str], str]:
    try:
        from app.memory.store import get_store
        store = get_store()
        items = await store.retrieve(session_id, query, top_k=3, user_id=user_id)
        if not items:
            return [], base_prompt
        context_lines = [f"- {item.content}" for item in items]
        context_block = "\n".join(context_lines)
        enriched = base_prompt + f"\n\nRelevant context from past interactions:\n{context_block}"
        return [item.content for item in items], enriched
    except Exception:
        return [], base_prompt


async def _persist(*, request_id, session_id, user_id, query, answer, cost_usd,
                   prompt_tokens, completion_tokens, latency_ms, tools_called,
                   iterations, messages) -> None:
    try:
        from app.db.repository import save_conversation, save_session_messages
        await save_conversation(
            request_id=request_id, session_id=session_id, user_id=user_id,
            query=query, answer=answer, cost_usd=cost_usd,
            prompt_tokens=prompt_tokens, completion_tokens=completion_tokens,
            latency_ms=latency_ms, tools_called=tools_called, iterations=iterations,
        )
        if session_id:
            await save_session_messages(session_id, messages)
    except Exception as exc:
        logger.debug("Persistence failed (non-fatal): %s", exc)


async def _save_episodic_memory(
    session_id: str | None, user_id: str | None, query: str, answer: str
) -> None:
    if not session_id and not user_id:
        return
    try:
        from app.memory.store import get_store
        store = get_store()
        summary = f"User asked: '{query[:120]}'. Answer summary: '{answer[:120]}'"
        await store.save(
            session_id=session_id,
            user_id=user_id,
            content=summary,
            memory_type="episodic",
            importance=0.4,
        )
    except Exception:
        pass


async def _run_eval(response: QAResponse, query: str, planner) -> QAResponse:
    try:
        from app.eval.scorer import score_answer
        source_texts = [s.name for s in response.sources]
        result = await score_answer(query, response.answer, source_texts, planner)
        if result:
            response = response.model_copy(update={"eval": result.to_dict()})
    except Exception as exc:
        logger.debug("Inline eval failed (non-fatal): %s", exc)
    return response
