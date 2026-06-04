# Agentic QA Service

A production-minded question-answering service with a tool-using ReAct agent (Claude + DuckDuckGo + mock weather) and a React chat UI.

## Quick Start

### With Docker (recommended)
```bash
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY
docker-compose up
```
- Backend API: http://localhost:8000
- Chat UI: http://localhost:3000

### Local development
```bash
# Backend
pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```
- Backend: http://localhost:8000
- Frontend: http://localhost:5173

## API Usage

```bash
# Non-streaming
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the weather in Paris?"}'

# Streaming (SSE)
curl -X POST http://localhost:8000/query/stream \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the capital of France?"}'
```

### Response format
```json
{
  "answer": "The weather in Paris is currently 18°C and cloudy.",
  "sources": [],
  "latency_ms": {
    "total": 1800,
    "by_step": {"llm_call_1": 900, "retrieve_1_get_weather": 2, "llm_call_2": 850}
  },
  "tokens": {"prompt": 680, "completion": 65},
  "reasoning_trace": ["Iteration 1: called get_weather({\"location\": \"Paris\"}) -> ..."]
}
```

## Tests

```bash
pytest -v
```

## Architecture

See [docs/architecture.md](docs/architecture.md) for the Section A system design document (RAG + Agents, multitenancy, caching, observability, deployment).

## Tools

| Tool | Description |
|------|-------------|
| `web_search` | DuckDuckGo Instant Answer API with retry and semaphore |
| `get_weather` | Mock weather data (deterministic by city) |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | required | Anthropic API key |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6` | Claude model to use |
| `MAX_CONCURRENT_REQUESTS` | `5` | Semaphore limit for tool HTTP calls |
| `BLOCKED_DOMAINS` | `` | Comma-separated blocked domains for policy layer |
| `PORT` | `8000` | Server port |

## Project Structure

```
app/
  agent/     # ReAct loop, planner (Anthropic SDK), policy engine
  tools/     # BaseTool ABC, ToolRegistry, web_search, weather
  models/    # Pydantic request/response models
  main.py    # FastAPI app with /query, /query/stream, /health
frontend/    # React 18 + TypeScript + Vite + Tailwind chat UI
tests/
  unit/      # Tool registry, policy, models, weather, web search
  integration/ # Agent loop, FastAPI endpoints
docs/
  architecture.md  # Section A: Production RAG + Agents design
```
