<div align="center">

# AGENTICQA

### Production-Grade Agentic Question Answering System

**ReAct Agent Loop · Groq llama-3.3-70b · Live Tools · Hybrid Memory · LLM-as-Judge Evals**

[![CI](https://github.com/husnainasim/AegnticQA/actions/workflows/ci.yml/badge.svg)](https://github.com/husnainasim/AegnticQA/actions)
[![Python](https://img.shields.io/badge/python-3.10%2B-blue)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://react.dev)
[![Tests](https://img.shields.io/badge/tests-58%20passing-brightgreen)](#tests)

---

![Hero Screenshot](docs/images/hero.png)

---

[Features](#features) · [Architecture](#architecture) · [Quick Start](#quick-start) · [API](#api-reference) · [Demo](#demo) · [Tests](#tests)

</div>

---

## What This Is

A fully production-wired **Agentic QA service** that takes a user question, reasons through it with a ReAct loop, calls live external APIs as tools, and returns a grounded cited answer — with cost tracking, hybrid memory, eval scoring, and a dark-terminal React UI.

Built for the AI Engineer Take-Home Assessment. Every core requirement and every bonus point is covered.

---

## Features

| Category | Feature | Status |
|---|---|---|
| **Core Agent** | ReAct loop (Reason + Act) with Groq `llama-3.3-70b-versatile` | ✅ |
| **Core Agent** | Tool registry — plug in any tool via `BaseTool` ABC | ✅ |
| **Core Agent** | `web_search` — DuckDuckGo instant-answer + `ddgs` fallback for news | ✅ |
| **Core Agent** | `get_weather` — OpenWeatherMap live data + deterministic mock fallback | ✅ |
| **Core Agent** | Structured JSON output: `answer · sources · latency_ms · tokens` | ✅ |
| **Core Agent** | `reasoning_trace` — full tool call log in every response | ✅ |
| **Bonus** | `/query/stream` SSE streaming endpoint | ✅ |
| **Bonus** | Pydantic JSON Schema validation on all inputs/outputs | ✅ |
| **Bonus** | Policy layer — blocks disallowed domains, raises HTTP 400 | ✅ |
| **Bonus** | Concurrency semaphore (`MAX_CONCURRENT_REQUESTS`) | ✅ |
| **Bonus** | Dockerfile + `docker-compose up -d` one-liner | ✅ |
| **Production** | Redis caching — DDG TTL 10 min, weather TTL 5 min | ✅ |
| **Production** | PostgreSQL persistence — conversations, sessions, memory | ✅ |
| **Production** | Hybrid memory — episodic/semantic/preference + vector similarity | ✅ |
| **Production** | PII masking in logs (email, phone, CNIC, SSN, credit card) | ✅ |
| **Production** | Prompt injection detection — 9 regex patterns → HTTP 400 | ✅ |
| **Production** | LLM-as-judge eval pipeline — groundedness, relevance, completeness | ✅ |
| **Production** | Langfuse observability + OpenTelemetry traces | ✅ |
| **Production** | Cost tracking — per-model token pricing, `cost_usd` in every response | ✅ |
| **Production** | GitHub Actions CI — pytest + docker build on every push | ✅ |
| **Frontend** | Dark-terminal React UI — ReAct trace panel, memory tab, eval scores | ✅ |

---

## Demo

[![Demo Video](https://img.youtube.com/vi/KLo2k0k56hc/maxresdefault.jpg)](https://youtu.be/KLo2k0k56hc)

### Screenshots

**ReAct Loop — tool reasoning visible in real time**

![ReAct Trace](docs/images/react-trace.png.jpg)

---

**Hybrid Memory — episodic memories persisted in PostgreSQL**

![Memory Panel](docs/images/memory-panel.png.jpg)

---

**LLM-as-Judge Evals — per-query grounding scores**

![Evals Panel](docs/images/evals-panel.png.jpg)

---

**Span Breakdown — real ms timings per step**

![Trace Summary](docs/images/trace-summary.png.jpg)

---

## Architecture

Full design document with 6 Mermaid diagrams → [docs/architecture.md](docs/architecture.md)

```
Client
  │  POST /query {query, session_id, evaluate}
  ▼
FastAPI (uvicorn, async)
  │  PolicyEngine: injection check + domain blocklist
  ▼
ReAct Agent Loop (app/agent/loop.py)
  │
  ├─► LLM Think ──► Groq llama-3.3-70b-versatile
  │       │
  │       ├─ tool_use ──► Tool Registry
  │       │                  ├─ web_search  ──► DuckDuckGo / ddgs
  │       │                  └─ get_weather ──► OpenWeatherMap
  │       │                         │
  │       │                  Redis Cache (TTL 5–10 min)
  │       │
  │       └─ end_turn ──► Final Answer
  │
  ├─► PostgreSQL  (persist conversation + session messages)
  ├─► Memory Store (save episodic memory, retrieve via cosine similarity)
  └─► Langfuse    (trace spans, eval scores, cost tracking)
  │
  ▼
QAResponse { answer, sources, latency_ms, tokens, cost_usd, reasoning_trace, eval }
```

### Repo Structure

```
.
├── app/                          ← FastAPI backend (Python)
│   ├── main.py                   ← Entry point — all endpoints, lifespan warmup
│   ├── agent/
│   │   ├── loop.py               ← ReAct agent loop (the core engine)
│   │   ├── planner.py            ← Groq API wrapper + httpx connection pooling
│   │   ├── policy.py             ← Domain blocklist + injection detection
│   │   └── guardrails.py         ← PII masking (email, CNIC, SSN, phone, CC)
│   ├── tools/
│   │   ├── base.py               ← BaseTool ABC + to_openai_schema()
│   │   ├── web_search.py         ← DuckDuckGo + ddgs fallback + retry + semaphore
│   │   └── weather.py            ← OpenWeatherMap + mock fallback + cache
│   ├── models/
│   │   ├── request.py            ← QueryRequest (Pydantic, validated)
│   │   └── response.py           ← QAResponse, Source, LatencyBreakdown, TokenUsage
│   ├── cache/
│   │   └── redis_client.py       ← Async Redis — graceful no-op if REDIS_URL unset
│   ├── memory/
│   │   ├── store.py              ← Hybrid memory: episodic / semantic / preference
│   │   └── embedder.py           ← SentenceTransformer + TF-IDF fallback
│   ├── db/
│   │   ├── models.py             ← SQLAlchemy ORM (conversations, sessions, memory)
│   │   ├── session.py            ← Async engine factory
│   │   └── repository.py         ← save_conversation, load_session_messages
│   ├── eval/
│   │   └── scorer.py             ← LLM-as-judge: groundedness / relevance / completeness
│   └── observability/
│       ├── tracer.py             ← Langfuse + OpenTelemetry spans
│       └── costs.py              ← Per-model token pricing table
│
├── frontend/                     ← React 18 + TypeScript + Vite (production UI)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx   ← Landing page
│   │   │   └── AppPage.tsx       ← 3-column chat app (sessions, chat, intelligence)
│   │   ├── components/
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── ReasoningTrace.tsx
│   │   │   ├── SessionIntelligence.tsx  ← Memory / Trace / Eval right panel
│   │   │   ├── SourcesList.tsx
│   │   │   ├── StatsBar.tsx
│   │   │   └── ChatInput.tsx
│   │   ├── hooks/
│   │   │   └── useStreamingQuery.ts  ← Wired to real backend (POST /query)
│   │   └── types.ts
│   └── vite.config.ts            ← Proxy: /query /memory /health → :8000
│
├── tests/                        ← 58 pytest tests (unit + integration)
├── docs/architecture.md          ← 6 Mermaid diagrams + full design doc
├── data/eval_golden_set.json     ← 10 golden Q&A pairs
├── scripts/run_eval.py           ← Offline eval runner
├── Dockerfile                    ← Backend container (python:3.12-slim)
├── Dockerfile.frontend           ← Frontend container
├── docker-compose.yml            ← Full stack: backend + frontend + postgres + redis + langfuse
└── .github/workflows/ci.yml      ← CI: pytest + docker build
```

---

## Quick Start

### Option A — Docker (one command)

```bash
git clone https://github.com/husnainasim/AegnticQA.git
cd AegnticQA

cp .env.example .env
# Open .env and add: GROQ_API_KEY=gsk_...

docker-compose up -d
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Langfuse | http://localhost:3001 |

### Option B — Local Dev

**Backend:**
```bash
pip install -e .
cp .env.example .env   # add GROQ_API_KEY
uvicorn app.main:app --reload
# → http://localhost:8000
```

**Frontend (separate terminal):**
```bash
cd frontend
npm install
npm run dev
# → http://localhost:4000
# Proxy auto-wires /query /memory /health → localhost:8000
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | **Yes** | Free at [console.groq.com](https://console.groq.com) |
| `GROQ_MODEL` | No | Default: `llama-3.3-70b-versatile` |
| `OPENWEATHER_API_KEY` | No | Live weather — falls back to mock if unset |
| `DATABASE_URL` | No | `postgresql://user:pass@host/db` — falls back to in-memory |
| `REDIS_URL` | No | `redis://localhost:6379` — falls back to no-cache |
| `LANGFUSE_PUBLIC_KEY` | No | Traces disabled if unset |
| `LANGFUSE_SECRET_KEY` | No | Paired with public key |
| `MAX_CONCURRENT_REQUESTS` | No | Semaphore limit for tool calls. Default: `5` |

---

## API Reference

### `POST /query`

```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Weather in Lahore", "session_id": "my-session", "evaluate": true}'
```

**Response shape (matches assessment spec exactly):**
```json
{
  "answer": "The current weather in Lahore is 35.2°C with clear sky and 23% humidity.",
  "sources": [
    { "name": "OpenWeatherMap", "url": "https://openweathermap.org" }
  ],
  "latency_ms": {
    "total": 1482,
    "by_step": {
      "llm_call_1": 170,
      "retrieve_1_get_weather": 720,
      "llm_call_2": 187
    }
  },
  "tokens": { "prompt": 1276, "completion": 50 },
  "cost_usd": 0.00079,
  "request_id": "af85064f-...",
  "reasoning_trace": [
    "Iteration 1: called get_weather({\"location\": \"Lahore\"}) -> {\"temp\": 35.2...}"
  ],
  "eval": {
    "groundedness": 5, "relevance": 5, "completeness": 4,
    "overall": 4.67, "reasoning": "Fully grounded in live weather data."
  }
}
```

### Other Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/query/stream` | SSE streaming — same response as one `data:` event |
| `GET` | `/memory/{session_id}` | List all memories for a session |
| `DELETE` | `/memory/{session_id}/{memory_id}` | Forget a specific memory |
| `DELETE` | `/memory/{session_id}` | Forget all memories for a session |
| `GET` | `/health` | Health check + model name |

---

## Tests

```bash
python -m pytest tests/ -v
# Expected: 58 passed, 3 warnings
```

| File | Tests |
|---|---|
| `test_guardrails.py` | 10 — PII masking, injection detection |
| `test_policy.py` | 5 — domain blocklist, URL validation |
| `test_web_search.py` | 4 — DDG tool, max_results, policy |
| `test_weather.py` | 5 — live + mock fallback, caching |
| `test_tool_registry.py` | 5 — register, dispatch, schema |
| `test_redis_cache.py` | 5 — graceful no-op degradation |
| `test_memory_store.py` | 5 — save, retrieve, forget |
| `test_scorer.py` | 4 — LLM-as-judge eval |
| `test_costs.py` | 4 — token cost per model |
| `test_response_models.py` | 5 — Pydantic round-trips |
| `test_agent_loop.py` | 3 — full ReAct integration |
| `test_api.py` | 3 — FastAPI endpoints, 400 on policy |

---

## Offline Eval

```bash
python scripts/run_eval.py
```

Runs `data/eval_golden_set.json` (10 curated Q&A pairs) through the LLM-as-judge scorer.

---

## Design Decisions

**Why Groq?** ~300 tok/s on llama-3.3-70b vs ~60 tok/s on GPT-4o. For an agentic loop that calls the LLM 2-3× per request, this compounds into 3-5× lower first-response latency.

**Why local SentenceTransformer?** Zero cost, no API dependency, runs on CPU in <100ms. In production you'd swap for `text-embedding-3-small` + Azure AI Search.

**Why DuckDuckGo?** No API key, no billing. The `ddgs` library handles news queries the instant-answer API misses. Production upgrade path: Bing Search API.

**Why graceful degradation everywhere?** Redis/Postgres/Langfuse/OTel all silently no-op if not configured. The core agent works with just `GROQ_API_KEY` — zero infra required for evaluation.

---

<div align="center">

Built by **Husnain Asim** · [hunsnainasim@gmail.com](mailto:hunsnainasim@gmail.com)

</div>
