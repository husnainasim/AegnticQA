import json
import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(message)s")

import app.tools.weather  # noqa: F401
import app.tools.web_search  # noqa: F401

from app.agent.loop import QAService
from app.agent.planner import Planner
from app.agent.policy import PolicyViolation
from app.models.request import QueryRequest


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.qa_service = QAService(planner=Planner())
    yield


app = FastAPI(title="Agentic QA Service", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "model": os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")}


@app.post("/query")
async def query(request: QueryRequest, http_request: Request):
    service: QAService = http_request.app.state.qa_service
    try:
        result = await service.run(request)
        return result
    except PolicyViolation as exc:
        return JSONResponse(status_code=400, content={"error": exc.reason})
    except Exception:
        logging.exception("Unhandled error in /query")
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


@app.post("/query/stream")
async def query_stream(request: QueryRequest, http_request: Request):
    """SSE endpoint - streams the final QAResponse as a single JSON event once complete."""
    service: QAService = http_request.app.state.qa_service

    async def event_stream():
        try:
            result = await service.run(request)
            yield f"data: {result.model_dump_json()}\n\n"
        except PolicyViolation as exc:
            yield f"data: {json.dumps({'error': exc.reason})}\n\n"
        except Exception:
            logging.exception("Unhandled error in /query/stream")
            yield f"data: {json.dumps({'error': 'Internal server error'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
