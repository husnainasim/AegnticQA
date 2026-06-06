#!/usr/bin/env python
"""
Offline eval runner — executes the golden test set against the live service
and prints a report. Optionally pushes scores to Langfuse.

Usage:
    python scripts/run_eval.py
    python scripts/run_eval.py --url http://localhost:8000
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).parent.parent
GOLDEN_SET = ROOT / "data" / "eval_golden_set.json"


async def run_case(client: httpx.AsyncClient, base_url: str, case: dict) -> dict:
    start = time.perf_counter()
    query = case["query"]
    expected_error = case.get("expected_error")

    try:
        resp = await client.post(
            f"{base_url}/query",
            json={"query": query, "evaluate": True},
            timeout=30,
        )
        elapsed_ms = int((time.perf_counter() - start) * 1000)

        if expected_error:
            # Should have returned an error
            if resp.status_code in (400, 422):
                body = resp.json()
                if expected_error.lower() in body.get("error", "").lower():
                    return {"id": case["id"], "status": "PASS", "latency_ms": elapsed_ms, "note": "correct error returned"}
            return {"id": case["id"], "status": "FAIL", "latency_ms": elapsed_ms,
                    "note": f"expected error '{expected_error}' but got {resp.status_code}"}

        if resp.status_code != 200:
            return {"id": case["id"], "status": "FAIL", "latency_ms": elapsed_ms,
                    "note": f"HTTP {resp.status_code}"}

        data = resp.json()
        answer = data.get("answer", "").lower()
        keywords = case.get("expected_keywords", [])
        missing = [kw for kw in keywords if kw.lower() not in answer]

        eval_scores = data.get("eval")
        overall = eval_scores["overall"] if eval_scores else None

        status = "PASS" if not missing else "PARTIAL"
        return {
            "id": case["id"],
            "status": status,
            "latency_ms": elapsed_ms,
            "answer_preview": data.get("answer", "")[:100],
            "missing_keywords": missing,
            "eval_overall": overall,
            "cost_usd": data.get("cost_usd"),
            "category": case.get("category"),
        }
    except Exception as exc:
        return {"id": case["id"], "status": "ERROR", "note": str(exc)}


async def main(base_url: str) -> None:
    cases = json.loads(GOLDEN_SET.read_text())
    print(f"\n{'='*60}")
    print(f"Agentic QA — Eval Suite ({len(cases)} cases)")
    print(f"Target: {base_url}")
    print(f"{'='*60}\n")

    results = []
    async with httpx.AsyncClient() as client:
        for case in cases:
            result = await run_case(client, base_url, case)
            results.append(result)
            status_icon = "✅" if result["status"] == "PASS" else ("⚠️" if result["status"] == "PARTIAL" else "❌")
            print(f"{status_icon} [{result['id']}] {result['status']} ({result.get('latency_ms', '?')}ms)"
                  + (f" | eval: {result['eval_overall']}" if result.get('eval_overall') else ""))
            if result.get("missing_keywords"):
                print(f"   Missing: {result['missing_keywords']}")
            if result.get("note"):
                print(f"   Note: {result['note']}")

    passed = sum(1 for r in results if r["status"] == "PASS")
    partial = sum(1 for r in results if r["status"] == "PARTIAL")
    failed = sum(1 for r in results if r["status"] in ("FAIL", "ERROR"))
    total_cost = sum(r.get("cost_usd") or 0 for r in results)

    print(f"\n{'='*60}")
    print(f"Results: {passed} PASS / {partial} PARTIAL / {failed} FAIL  (total: {len(cases)})")
    print(f"Total estimated cost: ${total_cost:.6f}")
    print(f"{'='*60}\n")

    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://localhost:8000")
    args = parser.parse_args()
    asyncio.run(main(args.url))
