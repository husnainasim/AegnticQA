# Evaluation Guide

The Agentic QA service has two evaluation modes: **online eval** (per-request scoring via the API) and **offline eval** (batch golden-set regression testing).

---

## Online Eval (Per-Request)

Pass `"evaluate": true` in any query request:

```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the capital of France?", "evaluate": true}'
```

The response includes an `eval` field:

```json
{
  "answer": "Paris is the capital of France.",
  "eval": {
    "groundedness": 5,
    "relevance": 5,
    "completeness": 4,
    "reasoning": "Answer is factually correct and directly addresses the question.",
    "overall": 4.67
  }
}
```

Scores (1–5 scale):
- **groundedness**: Is the answer supported by retrieved sources/facts?
- **relevance**: Does the answer directly address the question?
- **completeness**: Is the answer fully complete or does it miss important details?
- **overall**: Average of the three dimensions.

If Langfuse is configured, these scores are automatically pushed to the Langfuse dashboard for tracking over time.

---

## Offline Eval (Golden Set)

Run the full golden test set against a live server:

```bash
# Start the server first
docker-compose up -d

# Run eval (defaults to http://localhost:8000)
python scripts/run_eval.py

# Run against a different URL
python scripts/run_eval.py --url http://staging.example.com:8000
```

### Golden Set

The golden set is in `data/eval_golden_set.json` — 10 cases covering:

| # | Category | Expected behavior |
|---|----------|------------------|
| 1 | Weather query | Returns temperature + conditions |
| 2 | Weather with units | Respects unit preference |
| 3 | Web search | Finds factual answer |
| 4 | Multi-step reasoning | Uses multiple tool calls |
| 5 | General knowledge | Answers from LLM knowledge |
| 6 | Ambiguous query | Asks for clarification or best-effort answer |
| 7 | Edge case: empty-ish query | Handles gracefully |
| 8 | Edge case: very long query | Does not crash |
| 9 | PII in query | Masked in logs; answer still correct |
| 10 | Injection attempt | Returns HTTP 400 |

### Sample Output

```
Running eval against http://localhost:8000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 [1/10] weather in Lahore         PASS   (latency: 1.2s, cost: $0.000031)
 [2/10] weather in Celsius        PASS   (latency: 0.9s, cost: $0.000025)
 [3/10] who won 2023 Cricket WC   PASS   (latency: 2.1s, cost: $0.000087)
 [4/10] multi-step reasoning      PARTIAL (latency: 4.3s, cost: $0.000210)
 [5/10] capital of France         PASS   (latency: 0.8s, cost: $0.000018)
...

Results: 8 PASS / 1 PARTIAL / 1 FAIL (INJECTION — expected 400, got 400 ✓)
Total cost: $0.000612
```

### Viewing Results in Langfuse

If `LANGFUSE_PUBLIC_KEY` is set, eval results are automatically pushed to Langfuse as a **Dataset** named `golden-eval-YYYY-MM-DD`. To view:

1. Open **http://localhost:3001** → your project → **Datasets**
2. Select the dataset run to see per-item scores
3. Compare runs over time to detect regressions

---

## LLM-as-Judge Details

Scoring uses the same Groq model (`llama-3.3-70b-versatile`) as the main agent. The judge receives:
- The original query
- The agent's answer
- The list of sources used

It returns a JSON object with integer scores 1–5 and a brief reasoning string.

The judge prompt is designed to be conservative — a score of 3 means "acceptable," 5 means "excellent." Scores below 3 warrant investigation.

---

## Adding New Golden Cases

Edit `data/eval_golden_set.json`:

```json
{
  "id": "my_new_case",
  "query": "What is the speed of light?",
  "expected_keywords": ["299,792,458", "meters per second"],
  "should_use_tool": false,
  "expect_http_status": 200
}
```

Fields:
- `expected_keywords` — list of strings that must appear in the answer (case-insensitive)
- `should_use_tool` — if true, validates that at least one tool was called
- `expect_http_status` — 200 for normal queries, 400 for injection/policy tests
