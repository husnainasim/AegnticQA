import json
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("agentic_qa")

import app.tools.weather  # noqa: F401
import app.tools.web_search  # noqa: F401

from app.agent.loop import QAService
from app.agent.planner import Planner
from app.agent.policy import PolicyViolation
from app.models.request import QueryRequest


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Database
    from app.db.session import init_db, create_tables
    init_db()
    await create_tables()

    planner = Planner()
    app.state.qa_service = QAService(planner=planner)

    # OpenTelemetry
    from app.observability.tracer import setup_otel
    setup_otel(app)

    # Warmup ①: load SentenceTransformer weights into memory now, not on first query
    try:
        import asyncio as _asyncio
        t0 = time.perf_counter()
        await _asyncio.get_event_loop().run_in_executor(
            None, lambda: __import__('app.memory.embedder', fromlist=['embedder']).embedder()
        )
        logger.info("Embedder warmup done in %.0fms", (time.perf_counter() - t0) * 1000)
    except Exception as exc:
        logger.warning("Embedder warmup failed (non-fatal): %s", exc)

    # Warmup ②: prime the Groq HTTP connection so first real request is fast
    try:
        t0 = time.perf_counter()
        await planner.client.chat.completions.create(
            model=planner.model,
            messages=[{"role": "user", "content": "hi"}],
            max_tokens=1,
        )
        logger.info("Groq warmup done in %.0fms", (time.perf_counter() - t0) * 1000)
    except Exception as exc:
        logger.warning("Groq warmup failed (non-fatal): %s", exc)

    yield

    # Flush Langfuse on shutdown
    from app.observability.tracer import flush
    flush()


app = FastAPI(title="Agentic QA Service", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:4000", "http://localhost:4001"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Session-ID"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "model": os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"), "version": "0.2.0"}


@app.post("/query")
async def query(request: QueryRequest, http_request: Request):
    service: QAService = http_request.app.state.qa_service
    # Auto-generate session_id if not provided
    session_id = request.session_id or str(uuid.uuid4())
    request = request.model_copy(update={"session_id": session_id})
    try:
        result = await service.run(request)
        response = JSONResponse(content=result.model_dump())
        response.headers["X-Request-ID"] = result.request_id
        response.headers["X-Session-ID"] = session_id
        return response
    except PolicyViolation as exc:
        return JSONResponse(status_code=400, content={"error": exc.reason})
    except Exception:
        logging.exception("Unhandled error in /query")
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


@app.post("/query/stream")
async def query_stream(request: QueryRequest, http_request: Request):
    """SSE endpoint - streams the final QAResponse as a single JSON event once complete."""
    service: QAService = http_request.app.state.qa_service
    session_id = request.session_id or str(uuid.uuid4())
    request = request.model_copy(update={"session_id": session_id})

    async def event_stream():
        try:
            result = await service.run(request)
            yield f"data: {result.model_dump_json()}\n\n"
        except PolicyViolation as exc:
            yield f"data: {json.dumps({'error': exc.reason})}\n\n"
        except Exception:
            logging.exception("Unhandled error in /query/stream")
            yield f"data: {json.dumps({'error': 'Internal server error'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"X-Session-ID": session_id},
    )


# ---------------------------------------------------------------------------
# Memory management endpoints
# ---------------------------------------------------------------------------

@app.get("/memory/{session_id}")
async def list_memories(session_id: str):
    try:
        from app.memory.store import get_store
        items = await get_store().list_all(session_id)
        return {"session_id": session_id, "memories": [
            {"id": str(m.id), "content": m.content, "type": m.memory_type,
             "importance": m.importance, "created_at": str(m.created_at)}
            for m in items
        ]}
    except Exception:
        logging.exception("Error listing memories")
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


@app.delete("/memory/{session_id}/{memory_id}")
async def forget_memory(session_id: str, memory_id: str):
    try:
        from app.memory.store import get_store
        await get_store().forget(session_id, memory_id)
        return {"deleted": memory_id}
    except Exception:
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


@app.delete("/memory/{session_id}")
async def forget_all_memories(session_id: str):
    try:
        from app.memory.store import get_store
        count = await get_store().forget_all(session_id)
        return {"deleted_count": count, "session_id": session_id}
    except Exception:
        return JSONResponse(status_code=500, content={"error": "Internal server error"})
