"""Langfuse + OpenTelemetry observability wiring."""
from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger("agentic_qa")

# ---------------------------------------------------------------------------
# Langfuse — graceful no-op when keys not configured
# ---------------------------------------------------------------------------
try:
    from langfuse import Langfuse

    _lf = Langfuse(
        public_key=os.getenv("LANGFUSE_PUBLIC_KEY", ""),
        secret_key=os.getenv("LANGFUSE_SECRET_KEY", ""),
        host=os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com"),
        enabled=bool(os.getenv("LANGFUSE_PUBLIC_KEY")),
    )
    _LANGFUSE_ENABLED = bool(os.getenv("LANGFUSE_PUBLIC_KEY"))
except Exception as exc:
    logger.debug("Langfuse not available: %s", exc)
    _lf = None  # type: ignore[assignment]
    _LANGFUSE_ENABLED = False


class _NoopSpan:
    """Returned when Langfuse is disabled — silently accepts all calls."""
    def update(self, **_): return self
    def end(self, **_): return self
    def score(self, **_): return self


class _NoopTrace(_NoopSpan):
    def span(self, **_): return _NoopSpan()
    def generation(self, **_): return _NoopSpan()
    def update(self, **_): return self


def start_trace(name: str, query: str, session_id: str | None) -> Any:
    if not _LANGFUSE_ENABLED or _lf is None:
        return _NoopTrace()
    try:
        return _lf.trace(
            name=name,
            input={"query": query},
            session_id=session_id or "default",
        )
    except Exception as exc:
        logger.debug("Langfuse trace start failed: %s", exc)
        return _NoopTrace()


def span_llm(trace: Any, iteration: int, model: str, messages: list, max_tokens: int) -> Any:
    try:
        return trace.generation(
            name=f"llm_call_{iteration}",
            model=model,
            input=messages,
            model_parameters={"max_tokens": max_tokens},
        )
    except Exception:
        return _NoopSpan()


def end_llm_span(span: Any, output: str, usage: dict) -> None:
    try:
        span.end(output=output, usage=usage)
    except Exception:
        pass


def span_tool(trace: Any, tool_name: str, inputs: dict) -> Any:
    try:
        return trace.span(name=f"tool_{tool_name}", input=inputs)
    except Exception:
        return _NoopSpan()


def end_tool_span(span: Any, output: dict) -> None:
    try:
        span.end(output=output)
    except Exception:
        pass


def end_trace(trace: Any, output: str, metadata: dict) -> None:
    try:
        trace.update(output=output, metadata=metadata)
    except Exception:
        pass


def flush() -> None:
    if _LANGFUSE_ENABLED and _lf is not None:
        try:
            _lf.flush()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# OpenTelemetry — instrument FastAPI if SDK is available
# ---------------------------------------------------------------------------
def setup_otel(app) -> None:
    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        FastAPIInstrumentor.instrument_app(app)
        logger.info("OpenTelemetry FastAPI instrumentation enabled")
    except Exception as exc:
        logger.debug("OTel setup skipped: %s", exc)
