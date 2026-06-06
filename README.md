# Agentic QA Service

A production-grade question-answering service built on a ReAct agent loop (Groq `llama-3.3-70b-versatile` + DuckDuckGo + OpenWeatherMap) with a React chat UI, PostgreSQL persistence, Redis caching, Langfuse observability, hybrid memory, and a full eval pipeline.

## Feature Overview

| Category | Feature | Status |
|----------|---------|--------|
| **Agent** | ReAct loop (Reason + Act) | ✅ |
| **Agent** | Tool use: web search + weather | ✅ |
| **Agent** | Multi-turn session memory | ✅ |
| **Model** | Groq `llama-3.3-70b-versatile` (OpenAI-compatible) | ✅ |
| **Observability** | Langfuse traces + LLM/tool spans | ✅ |
| **Observability** | Token cost tracking per request | ✅ |
| **Observability** | OpenTelemetry FastAPI instrumentation | ✅ |
| **Persistence** | PostgreSQL: conversations + sessions + memory | ✅ |
| **Caching** | Redis: tool response caching (weather 5min, search 10min) | ✅ |
| **Memory** | Episodic + semantic + preference memory | ✅ |
| **Memory** | Cosine similarity retrieval (sentence-transformers / TF-IDF) | ✅ |
| **Memory** | User-editable memory (forget individual or all) | ✅ |
| **Memory** | Memory pruning (importance-based) | ✅ |
| **Safety** | PII masking (email, phone, credit card, SSN, CNIC) | ✅ |
| **Safety** | Prompt injection detection + 400 response | ✅ |
| **Safety** | Domain blocklist policy | ✅ |
| **Eval** | LLM-as-judge scoring (groundedness, relevance, completeness) | ✅ |
| **Eval** | Golden set offline eval runner | ✅ |
| **Eval** | Langfuse dataset integration for score tracking | ✅ |
| **CI/CD** | GitHub Actions: test + docker-build on push | ✅ |
| **Rollback** | `main` branch + `v0.1-groq-working` tag | ✅ |

---

## Quick Start

### With Docker (recommended — all services)

```bash
cp .env.example .env
# Edit .env — add your GROQ_API_KEY (required)
# Optionally add OPENWEATHER_API_KEY for real weather data

docker-compose up -d
```

Services started:
- **Backend API**: http://localhost:8000
- **Chat UI**: http://localhost:3000
- **Langfuse Dashboard**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### Local Development (no Docker required)

All infrastructure is optional — the service degrades gracefully when DB/Redis/Langfuse are not configured.

```bash
# Backend
pip install -e ".[dev]"
cp .env.example .env          # add GROQ_API_KEY at minimum
uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

- Backend: http://localhost:8000
- Frontend: http://localhost:5173

---

## API Usage

```bash
# Basic query
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the weather in Lahore?"}'

# Multi-turn session
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "And what about Karachi?", "session_id": "my-session-1"}'

# With eval scoring
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the capital of France?", "evaluate": true}'

# Streaming (SSE)
curl -X POST http://localhost:8000/query/stream \
  -H "Content-Type: application/json" \
  -d '{"query": "What is quantum computing?"}'

# Memory management
curl http://localhost:8000/memory/{session_id}                     # list
curl -X DELETE http://localhost:8000/memory/{session_id}/{id}      # forget one
curl -X DELETE http://localhost:8000/memory/{session_id}           # forget all
```

### Response Format

```json
{
  "answer": "The weather in Lahore is 32°C and sunny.",
  "sources": [],
  "latency_ms": {"total": 1800, "by_step": {"llm_call_1": 900}},
  "tokens": {"prompt": 680, "completion": 65},
  "cost_usd": 0.000053,
  "request_id": "uuid-...",
  "session_id": "my-session-1",
  "memories_used": ["User is based in Pakistan"],
  "reasoning_trace": ["Iteration 1: called get_weather(...)"],
  "eval": null
}
```

---

## Tests

```bash
pytest -v
```

Target: ≥57 tests across unit and integration suites.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | **required** | Groq API key |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Model to use |
| `DATABASE_URL` | _(optional)_ | PostgreSQL connection string (e.g., `postgresql://user:pass@localhost:5432/db`) |
| `REDIS_URL` | _(optional)_ | Redis connection string (e.g., `redis://localhost:6379`) |
| `LANGFUSE_PUBLIC_KEY` | _(optional)_ | Langfuse public key for observability |
| `LANGFUSE_SECRET_KEY` | _(optional)_ | Langfuse secret key |
| `LANGFUSE_HOST` | `https://cloud.langfuse.com` | Langfuse host (use `http://localhost:3001` for self-hosted) |
| `OPENWEATHER_API_KEY` | _(optional)_ | OpenWeatherMap key for real weather data (falls back to deterministic mock) |
| `MAX_CONCURRENT_REQUESTS` | `5` | Semaphore limit for tool HTTP calls |
| `BLOCKED_DOMAINS` | `` | Comma-separated blocked domains for policy layer |
| `PORT` | `8000` | Server port |

---

## Project Structure

```
app/
  agent/        # ReAct loop, planner (Groq via OpenAI SDK), policy engine, guardrails
  tools/        # BaseTool ABC, ToolRegistry, web_search, weather
  models/       # Pydantic request/response models
  db/           # SQLAlchemy models, async session, repository (PostgreSQL)
  cache/        # Redis async client with graceful no-op fallback
  memory/       # Hybrid memory store (episodic/semantic/preference) + embedder
  observability/ # Langfuse tracer, OpenTelemetry setup, cost calculator
  eval/         # LLM-as-judge scorer, Langfuse dataset pusher
  main.py       # FastAPI app: /query, /query/stream, /health, /memory/*
frontend/       # React 18 + TypeScript + Vite + Tailwind chat UI
tests/
  unit/         # Guardrails, costs, scorer, memory store, Redis cache
  integration/  # Agent loop, FastAPI endpoints
scripts/
  run_eval.py   # Offline golden-set eval runner
data/
  eval_golden_set.json  # 10 regression test cases
docs/
  architecture.md   # Production RAG + Agents system design
  langfuse-setup.md # Langfuse observability setup guide
  memory-system.md  # Hybrid memory architecture + API
  eval-guide.md     # How to run eval suite, view results
```

---

## Documentation

- [Langfuse Setup Guide](docs/langfuse-setup.md) — start Langfuse, get API keys, view traces
- [Memory System](docs/memory-system.md) — how hybrid memory works, user memory management
- [Eval Guide](docs/eval-guide.md) — run offline evals, interpret scores, push to Langfuse

---

## Rollback

```bash
# Roll back to v0.1 (working but without production features)
git checkout v0.1-groq-working

# Or just use the main branch
git checkout main
```
