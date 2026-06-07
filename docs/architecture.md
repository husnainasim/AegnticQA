# Production RAG + Agents Architecture

## Overview

A multitenant "Answering over External Data" system combining Retrieval-Augmented Generation (RAG) with a tool-using agent layer. Users submit natural-language queries; the system retrieves relevant documents, calls live APIs as needed, and returns a grounded, cited answer.

```mermaid
flowchart TD
    Client(["👤 Client / Frontend"])
    APIM["Azure API Management\n(JWT auth · rate limit · tenant_id)"]
    Backend["FastAPI Backend\n(uvicorn · async)"]
    AgentLoop["ReAct Agent Loop\n(planner + tool registry)"]
    Groq["☁️ Groq API\nllama-3.3-70b-versatile"]
    Tools["Tool Registry"]
    KB["retrieve_from_knowledge_base"]
    WS["web_search\n(DuckDuckGo)"]
    WX["get_weather\n(OpenWeatherMap)"]
    Redis[("Redis Cache\nTTL: 5–10 min")]
    PG[("PostgreSQL\nconversations · memory · sessions")]
    AISearch["Azure AI Search\n(vector + BM25 hybrid)"]
    Langfuse["Langfuse\n(traces · evals · costs)"]

    Client -->|"POST /query\n{query, session_id}"| APIM
    APIM -->|"validated request"| Backend
    Backend --> AgentLoop
    AgentLoop <-->|"think · tool_calls"| Groq
    AgentLoop --> Tools
    Tools --> KB & WS & WX
    KB <--> Redis
    WS <--> Redis
    WX <--> Redis
    KB --> AISearch
    AgentLoop -->|"persist conversation\n+ episodic memory"| PG
    AgentLoop -->|"spans · scores · costs"| Langfuse
    Backend -->|"QAResponse JSON\n(answer · sources · latency_ms · tokens)"| Client

    style Groq fill:#7c3aed,color:#fff
    style Redis fill:#dc2626,color:#fff
    style PG fill:#1d4ed8,color:#fff
    style Langfuse fill:#059669,color:#fff
    style AISearch fill:#0369a1,color:#fff
```

---

## 1. Data Ingestion & Indexing

**Ingestion pipeline**: Documents are chunked into 512-token segments with 64-token overlap (preserves sentence context across boundaries). Each chunk is embedded using a local `sentence-transformers/all-MiniLM-L6-v2` model (zero cost, runs on CPU) — or swapped for `text-embedding-3-small` at $0.02/1M tokens when higher accuracy is needed. Embeddings are stored in **Azure AI Search** with both vector and BM25 keyword indexes.

**Hybrid search**: At query time, the agent calls a `retrieve_from_knowledge_base` tool that executes a hybrid query (vector ANN + BM25 keyword) and applies **Reciprocal Rank Fusion (RRF)** to rerank results. This outperforms pure vector search on keyword-heavy queries (e.g., product codes, names).

**Metadata**: Each chunk stores `tenant_id`, `source_url`, `document_title`, `last_updated`. These flow through as source citations in the final answer.

```mermaid
flowchart LR
    Docs["📄 Raw Documents\n(PDF · HTML · DOCX)"]
    Chunk["Chunker\n512 tokens · 64 overlap"]
    Embed["Embedder\nall-MiniLM-L6-v2"]
    Index[("Azure AI Search\nvector + BM25")]
    Query["User Query"]
    QEmbed["Query Embedding"]
    Hybrid["Hybrid Search\nANN + BM25 + RRF"]
    Results["Top-K Chunks\n+ metadata"]

    Docs --> Chunk --> Embed --> Index
    Query --> QEmbed --> Hybrid
    Index --> Hybrid --> Results

    style Index fill:#0369a1,color:#fff
    style Hybrid fill:#7c3aed,color:#fff
```

---

## 2. Agentic Layer: Planner & Tool Selection

The agent uses a **ReAct loop** (Reason + Act). At each step the LLM (`llama-3.3-70b-versatile` via Groq) decides whether to call a tool or produce a final answer. Tools are registered in a **ToolRegistry**; the planner receives all tool schemas and picks based on the query.

```mermaid
flowchart TD
    Start(["User Query\n+ session context\n+ memories"])
    Think["🧠 LLM Think\n(Groq llama-3.3-70b)\ntool_choice = auto"]
    Decision{stop_reason?}
    ToolCall["Dispatch Tool\n(from registry)"]
    ToolResult["Append tool result\nto messages"]
    MaxIter{iterations\n≥ 5?}
    Answer["✅ Final Answer\n(cited · structured JSON)"]
    Fallback["⚠️ Fallback\n'Unable to complete'"]

    Start --> Think --> Decision
    Decision -->|"end_turn"| Answer
    Decision -->|"tool_use"| ToolCall
    ToolCall --> ToolResult --> Think
    Think --> MaxIter
    MaxIter -->|"yes"| Fallback
    MaxIter -->|"no"| Decision

    style Think fill:#7c3aed,color:#fff
    style Answer fill:#059669,color:#fff
    style Fallback fill:#dc2626,color:#fff
```

| Tool | Trigger |
|------|---------|
| `retrieve_from_knowledge_base` | Internal docs questions |
| `web_search` | Current events, external facts |
| `get_weather` | Weather queries |
| `currency_convert` | FX rate questions |

The system prompt instructs the model to explain its tool selection, enabling an auditable `reasoning_trace` in every response. Max iterations = 5 prevents runaway cost.

---

## 3. Cost, Latency & Caching

**Prompt caching**: System prompt and tool definitions marked with `cache_control: ephemeral` (1-hour TTL). Cache reads cost ~10% of normal input tokens — 60-90% savings on repeated queries.

**Vector cache**: Query embeddings cached in Redis (TTL 5 min) to avoid re-embedding identical queries.

**HTTP cache**: DuckDuckGo and weather responses cached in Redis by query key (TTL 10 min), gated by a semaphore (default: 5 concurrent external calls) to prevent thundering-herd.

```mermaid
sequenceDiagram
    participant C as Client
    participant B as FastAPI
    participant R as Redis Cache
    participant A as Agent Loop
    participant G as Groq API
    participant T as Tool (DDG/Weather)

    C->>B: POST /query
    B->>A: run(request)
    A->>R: cache_get(query_key)
    alt cache hit
        R-->>A: cached result
    else cache miss
        A->>G: LLM think (iteration 1) ~170ms
        G-->>A: tool_calls: [web_search]
        A->>T: web_search(query) ~700ms
        T-->>A: results
        A->>R: cache_set(TTL=600s)
        A->>G: LLM think (iteration 2) ~160ms
        G-->>A: end_turn + answer
    end
    A-->>B: QAResponse (answer · sources · latency_ms)
    B-->>C: JSON (~1.1s total)
```

**Latency budget** (P95 target: <5s):
- Embedding: ~50ms
- Vector retrieval: ~100ms
- LLM call (2 turns avg): ~1.5s each
- Total: ~3.5s

---

## 4. Security & Multitenancy

**RBAC**: Each API request carries a JWT with `tenant_id` and `role`. Azure API Management validates the token; the `tenant_id` is injected as a mandatory filter on every AI Search query (`$filter=tenant_id eq '{id}'`).

**Data isolation**: Tenant data stored in separate Azure AI Search indexes (strong isolation) or a shared index with row-level `tenant_id` filters (cost-efficient). Strong isolation recommended for regulated industries (healthcare, finance).

**Audit logging**: Every tool call and LLM interaction logged as structured JSON to Azure Monitor with `tenant_id`, `user_id`, `query_hash`, `tools_called`, and `latency_ms`. PII fields are hashed, not stored in plain text.

**Secret handling**: `GROQ_API_KEY` and external API keys live in **Azure Key Vault**, surfaced to the container at startup via managed identity — never in code or image layers.

```mermaid
flowchart LR
    Req["Incoming Request\n+ Bearer JWT"]
    APIM["API Management\nJWT validation\ntenant_id extraction"]
    Guard["Guardrails\nPII masking\ninjection detection"]
    Filter["AI Search Query\n$filter=tenant_id eq X"]
    Vault["Azure Key Vault\nAPI keys (managed identity)"]
    Logs["Audit Log\n{tenant_id · query_hash\n· tools_called · latency_ms}"]

    Req --> APIM -->|"tenant_id injected"| Guard --> Filter
    Vault -.->|"secrets at startup"| APIM
    Filter -.->|"every request"| Logs

    style APIM fill:#0369a1,color:#fff
    style Vault fill:#dc2626,color:#fff
    style Logs fill:#059669,color:#fff
```

---

## 5. Observability

**Traces**: Each request produces a trace tree (request → LLM calls → tool calls) via OpenTelemetry, exported to Azure Monitor Application Insights. Trace IDs are included in API responses for client-side correlation.

**Metrics** (structured JSON logs ingested by Azure Monitor):
- `request_latency_ms` (p50, p95, p99)
- `token_usage` (prompt, completion, cache_hit_rate)
- `tool_call_count` and `tool_error_rate` per tool
- `iterations_per_request`

**Budgets & alerts**: Alert if p95 latency > 8s or token cost per request > $0.05. Dashboard panels show latency breakdown by step to identify bottlenecks.

**Failure dashboards**: Separate panels for tool timeouts, LLM API errors, policy violations, and max-iteration breaches.

```mermaid
flowchart TD
    Req["Request\n(trace_id generated)"]
    LLM1["llm_call_1\nspan: duration · tokens · cost"]
    Tool["tool_call\nspan: tool_name · inputs · latency"]
    LLM2["llm_call_2\nspan: duration · tokens · cost"]
    Eval["LLM-as-Judge Eval\ngroundedness · relevance · completeness"]
    OTel["OpenTelemetry\nexport"]
    Langfuse["Langfuse Dashboard\ntraces · scores · costs"]
    AzMon["Azure Monitor\nlatency alerts · error rates"]

    Req --> LLM1 --> Tool --> LLM2 --> Eval
    LLM1 & Tool & LLM2 & Eval --> OTel
    OTel --> Langfuse & AzMon

    style Langfuse fill:#059669,color:#fff
    style AzMon fill:#0369a1,color:#fff
    style Eval fill:#7c3aed,color:#fff
```

---

## 6. Deployment

**Containerized**: Service packaged as a Docker image (python:3.12-slim). Image published to Azure Container Registry on every main branch push.

**CI/CD** (GitHub Actions):
1. `test` job: `pytest` full suite
2. `build` job: `docker build` + push to ACR
3. `deploy` job: update Azure Container Apps revision

**Blue/green / canary**: Azure Container Apps supports traffic splitting. New revisions receive 10% traffic initially; automatic promotion to 100% if p95 latency and error rate stay below thresholds for 15 minutes. Rollback is a one-command revision reactivation.

**Scaling**: Container Apps scales 1→20 replicas on HTTP request queue depth. Each replica handles ~50 concurrent async requests. At 1000 req/min peak, 2-3 replicas suffice.

```mermaid
flowchart LR
    PR["Git Push / PR"]
    Test["① pytest\n58 tests\n+ postgres + redis"]
    Build["② docker build\nbackend + frontend\npush to ACR"]
    Deploy["③ Container Apps\nnew revision (10% traffic)"]
    Monitor["④ Monitor 15 min\np95 latency · error rate"]
    Promote["✅ Promote to 100%"]
    Rollback["🔁 Rollback\n(one command)"]

    PR --> Test -->|"pass"| Build --> Deploy --> Monitor
    Monitor -->|"healthy"| Promote
    Monitor -->|"degraded"| Rollback

    style Test fill:#1d4ed8,color:#fff
    style Promote fill:#059669,color:#fff
    style Rollback fill:#dc2626,color:#fff
```
