"""PII masking and prompt-injection detection guardrails."""
from __future__ import annotations

import re

# ---------------------------------------------------------------------------
# PII patterns
# ---------------------------------------------------------------------------
_PII_PATTERNS: dict[str, re.Pattern] = {
    "email":       re.compile(r'\b[\w.+\-]+@[\w\-]+\.[a-zA-Z]{2,}\b'),
    "cnic":        re.compile(r'\b\d{5}-\d{7}-\d\b'),  # Pakistani CNIC — must run before phone
    "ssn":         re.compile(r'\b\d{3}-\d{2}-\d{4}\b'),
    "phone":       re.compile(r'\b(\+?\d[\d\s\-().]{6,14}\d)\b'),
    "credit_card": re.compile(r'\b(?:\d[ \-]?){13,16}\b'),
}

# ---------------------------------------------------------------------------
# Prompt injection patterns
# ---------------------------------------------------------------------------
_INJECTION_PATTERNS: list[re.Pattern] = [
    re.compile(r'ignore\s+(previous|all|above|prior|the\s+previous)\s+instructions?', re.I),
    re.compile(r'you\s+are\s+now\s+(a|an|the)\b', re.I),
    re.compile(r'\b(system|assistant)\s*:\s', re.I),
    re.compile(r'<\|im_start\|>|<\|im_end\|>|\[INST\]|\[/INST\]', re.I),
    re.compile(r'\bjailbreak\b|\bDAN\s+mode\b|\bdeveloper\s+mode\b', re.I),
    re.compile(r'disregard\s+(all|previous|prior)\s+(instructions?|rules?|guidelines?)', re.I),
    re.compile(r'act\s+as\s+(if\s+you\s+are|a)\s+\w', re.I),
]


def mask_pii(text: str) -> tuple[str, list[str]]:
    """Replace PII in text with redaction tokens. Returns (masked_text, [pii_types_found])."""
    found: list[str] = []
    for label, pattern in _PII_PATTERNS.items():
        if pattern.search(text):
            found.append(label)
            text = pattern.sub(f"[{label.upper()}_REDACTED]", text)
    return text, found


def has_pii(text: str) -> bool:
    return any(p.search(text) for p in _PII_PATTERNS.values())


def is_injection_attempt(text: str) -> bool:
    """Returns True if text contains prompt injection patterns."""
    return any(p.search(text) for p in _INJECTION_PATTERNS)
