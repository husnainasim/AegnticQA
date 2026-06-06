# Langfuse Setup Guide

Langfuse gives you a full observability dashboard: every request, LLM call, tool invocation, token cost, latency, and LLM-as-judge eval score — all in one place.

---

## Quick Start (Docker Compose)

Everything is pre-configured in `docker-compose.yml`. Just run:

```bash
docker-compose up -d
```

Langfuse will be available at **http://localhost:3001** in ~30 seconds.

---

## Create Your First Project

1. Open **http://localhost:3001** in your browser.
2. Click **Sign Up** and create an account (local only — no data leaves your machine).
3. You'll be prompted to create an **Organization** and a **Project**. Name them anything (e.g., "Agentic QA").
4. Go to **Settings → API Keys** and click **Create new API key**.
5. Copy the **Public Key** and **Secret Key**.

---

## Wire Keys to the Backend

Add to your `.env` file:

```env
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_HOST=http://localhost:3001
```

Then restart the backend:

```bash
docker-compose restart backend
```

If `LANGFUSE_PUBLIC_KEY` is not set, the backend runs silently without tracing — no errors, just no data in Langfuse.

---

## What Gets Traced

Every call to `POST /query` produces a **Trace** in Langfuse with:

| Span | What it captures |
|------|-----------------|
| `llm_call_N` | Model, messages sent, token usage, latency, cost |
| `tool_weather` / `tool_web_search` | Tool inputs, outputs, latency |
| Root trace | Full query, answer, session ID, total cost |

**Scores** are automatically pushed when `evaluate: true` is passed in the request:
- `groundedness` (1–5): Is the answer supported by retrieved facts?
- `relevance` (1–5): Does the answer address the question?
- `completeness` (1–5): Is the answer complete?

---

## Viewing Traces

1. Open **http://localhost:3001** → your project → **Traces**.
2. Click any trace to see the full span tree: LLM calls → tool calls → scores.
3. Use the **Sessions** view to see multi-turn conversations grouped together.
4. Use **Scores** to filter runs by eval quality over time.

---

## Cost Dashboard

Each trace reports `cost_usd` based on Groq's token pricing:
- `llama-3.3-70b-versatile`: $0.00059/1K prompt · $0.00079/1K completion
- `llama-3.1-8b-instant`: $0.00005/1K prompt · $0.00008/1K completion

Go to **Langfuse → Analytics** to see cost trends over time.

---

## Cloud Langfuse (Optional)

To use Langfuse Cloud instead of self-hosted:

1. Sign up at https://cloud.langfuse.com
2. Create a project and copy the API keys.
3. Set in `.env`:

```env
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com
```

Remove the `langfuse` service from `docker-compose.yml` if you switch to cloud.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Traces not appearing | Check `LANGFUSE_PUBLIC_KEY` is set and backend was restarted |
| "Connection refused" | Wait ~30s for Langfuse to start; check `docker-compose logs langfuse` |
| Database errors in Langfuse | Langfuse shares the Postgres instance — run `docker-compose up postgres -d` first |
| No scores showing | Pass `"evaluate": true` in your request body |
