import json
import logging
import time
from dataclasses import dataclass, field

from app.agent.planner import Planner
from app.models.request import QueryRequest
from app.models.response import QAResponse, LatencyBreakdown, Source, TokenUsage
from app.tools import all_schemas, dispatch

logger = logging.getLogger("agentic_qa")

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


def _log(event: str, **kwargs):
    record = {"event": event, "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), **kwargs}
    logger.info(json.dumps(record))


class QAService:
    def __init__(self, planner: Planner | None = None):
        self.planner = planner or Planner()

    async def run(self, request: QueryRequest) -> QAResponse:
        loop_start = time.perf_counter_ns()
        state = AgentState()
        state.messages.append({"role": "user", "content": request.query})

        tools = all_schemas()
        answer = "I was unable to complete the request within the iteration limit."

        while state.iteration < request.max_iterations:
            llm_start = time.perf_counter_ns()
            planner_resp = await self.planner.think(state.messages, tools, _SYSTEM_PROMPT)
            llm_ms = max(1, (time.perf_counter_ns() - llm_start) // 1_000_000)
            step_key = f"llm_call_{state.iteration + 1}"
            state.step_latencies[step_key] = llm_ms
            state.token_prompt += planner_resp.usage.prompt
            state.token_completion += planner_resp.usage.completion

            _log(
                "llm_call",
                iteration=state.iteration + 1,
                stop_reason=planner_resp.stop_reason,
                latency_ms=llm_ms,
                tokens={"prompt": planner_resp.usage.prompt, "completion": planner_resp.usage.completion},
            )

            state.messages.append({"role": "assistant", "content": planner_resp.content})
            state.iteration += 1

            if planner_resp.stop_reason == "end_turn":
                if planner_resp.text_response:
                    answer = planner_resp.text_response
                break

            tool_results_content = []
            for tc in planner_resp.tool_calls:
                _log("tool_call_start", tool=tc.name, inputs=tc.inputs, iteration=state.iteration)
                retrieve_start = time.perf_counter_ns()

                try:
                    result = await dispatch(tc.name, tc.inputs)
                    retrieve_ms = max(1, (time.perf_counter_ns() - retrieve_start) // 1_000_000)
                    retrieve_key = f"retrieve_{state.iteration}_{tc.name}"
                    state.step_latencies[retrieve_key] = retrieve_ms

                    _log("tool_call_end", tool=tc.name, latency_ms=retrieve_ms)

                    if tc.name == "web_search" and "results" in result:
                        for r in result["results"]:
                            url = r.get("url", "")
                            text = r.get("text", "")
                            if url and text:
                                state.sources.append(Source(name=text[:80], url=url))

                    state.reasoning_trace.append(
                        f"Iteration {state.iteration}: called {tc.name}({json.dumps(tc.inputs)}) -> {json.dumps(result)[:200]}"
                    )

                    tool_results_content.append({
                        "type": "tool_result",
                        "tool_use_id": tc.id,
                        "content": json.dumps(result),
                    })

                except Exception as exc:
                    retrieve_ms = max(1, (time.perf_counter_ns() - retrieve_start) // 1_000_000)
                    _log("tool_error", tool=tc.name, error=str(exc), latency_ms=retrieve_ms)
                    state.reasoning_trace.append(
                        f"Iteration {state.iteration}: {tc.name} failed - {exc}"
                    )
                    tool_results_content.append({
                        "type": "tool_result",
                        "tool_use_id": tc.id,
                        "is_error": True,
                        "content": f"Tool failed: {exc}",
                    })

            state.messages.append({"role": "user", "content": tool_results_content})
        else:
            _log("max_iterations_reached", query=request.query)

        total_ms = max(1, (time.perf_counter_ns() - loop_start) // 1_000_000)
        _log("request_complete", total_ms=total_ms, iterations=state.iteration)

        return QAResponse(
            answer=answer,
            sources=state.sources,
            latency_ms=LatencyBreakdown(total=total_ms, by_step=state.step_latencies),
            tokens=TokenUsage(prompt=state.token_prompt, completion=state.token_completion),
            reasoning_trace=state.reasoning_trace,
        )
