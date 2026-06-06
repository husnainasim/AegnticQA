# Hybrid Memory System

The Agentic QA service implements a three-tier memory architecture that enables long-term personalization without requiring users to repeat themselves.

---

## Memory Types

| Type | What it stores | Example |
|------|---------------|---------|
| `episodic` | Specific past interactions | "User asked about Lahore weather on 2026-06-06" |
| `semantic` | Learned facts about the user | "User is based in Pakistan" |
| `preference` | User preferences and settings | "User prefers Celsius for temperatures" |

---

## How It Works

### Storage

Memories are stored in PostgreSQL (`memory_items` table) when the DB is available, or in an in-process dict as fallback when running without Docker.

Each memory item has:
- `content` — the remembered fact (plain text)
- `memory_type` — episodic / semantic / preference
- `importance` — float 0.0–1.0 (higher = kept longer during pruning)
- `embedding` — vector representation for similarity search
- `expires_at` — optional expiry (null = never expires)

### Retrieval

Before each LLM call, the system:
1. Encodes the current query using `sentence-transformers/all-MiniLM-L6-v2` (or TF-IDF fallback)
2. Computes cosine similarity against all stored memory embeddings for the session
3. Injects the top-3 most relevant memories into the system prompt

This means the LLM always has context like:
```
Relevant context from past interactions:
- User is based in Pakistan (from 2026-06-01)
- User prefers Celsius temperatures (from 2026-06-03)
```

### Auto-Saving

After each response, the agent automatically extracts and saves episodic memories about what was discussed. Preference and semantic memories are saved when the agent detects user corrections or stated preferences.

### Pruning

When a session accumulates more than 100 memory items, the lowest-importance items are automatically removed. Pruning happens asynchronously and does not affect response latency.

---

## API: Managing Memories

### List all memories for a session

```bash
GET /memory/{session_id}
```

Response:
```json
[
  {
    "id": "uuid-...",
    "content": "User is based in Pakistan",
    "memory_type": "semantic",
    "importance": 0.8,
    "created_at": "2026-06-06T10:00:00Z"
  }
]
```

### Forget a specific memory

```bash
DELETE /memory/{session_id}/{memory_id}
```

Response: `204 No Content`

### Forget all memories for a session

```bash
DELETE /memory/{session_id}
```

Response:
```json
{"deleted": 5}
```

---

## Session IDs

Sessions link queries together for multi-turn memory. Pass `session_id` in every request:

```json
{
  "query": "What temperature unit do I prefer?",
  "session_id": "user-alice-session-1"
}
```

The backend also returns `X-Session-ID` in response headers — you can use this auto-generated ID for subsequent requests if you don't supply your own.

User IDs (`user_id` field) allow memories to persist across sessions for the same user. Memories scoped to a `user_id` are shared across all that user's sessions.

---

## Embedder Details

The system tries two embedders in order:

1. **sentence-transformers** (`all-MiniLM-L6-v2`, 384-dim, ~22M params) — installed when `sentence-transformers` package is present. Produces high-quality semantic embeddings. First run downloads the model (~90MB, cached locally).

2. **TF-IDF fallback** — pure Python, no downloads required. Lower quality but always available. Used automatically if sentence-transformers is not installed.

To force the sentence-transformers embedder, install it:
```bash
pip install sentence-transformers
```

---

## Privacy

- PII in queries (email, phone, credit card, SSN, CNIC) is masked before being stored in memories and audit logs.
- The original unmasked query is sent to the LLM for answering but never persisted.
- Users can delete all memories at any time via `DELETE /memory/{session_id}`.
