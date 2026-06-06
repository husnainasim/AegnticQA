"""Lightweight text embedder — uses sentence-transformers if available, else TF-IDF fallback."""
from __future__ import annotations

import logging
import math
import re
from collections import Counter
from typing import Protocol

logger = logging.getLogger("agentic_qa")


class Embedder(Protocol):
    def embed(self, text: str) -> list[float]: ...
    def similarity(self, a: list[float], b: list[float]) -> float: ...


# ---------------------------------------------------------------------------
# TF-IDF fallback (no ML deps required)
# ---------------------------------------------------------------------------
class TFIDFEmbedder:
    """Very lightweight bag-of-words embedder for semantic similarity."""
    _DIM = 256

    def _tokenize(self, text: str) -> list[str]:
        return re.findall(r'\b\w+\b', text.lower())

    def embed(self, text: str) -> list[float]:
        tokens = self._tokenize(text)
        counts = Counter(tokens)
        vec = [0.0] * self._DIM
        for token, count in counts.items():
            idx = hash(token) % self._DIM
            vec[idx] += count
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]

    def similarity(self, a: list[float], b: list[float]) -> float:
        if len(a) != len(b):
            return 0.0
        return sum(x * y for x, y in zip(a, b))


# ---------------------------------------------------------------------------
# SentenceTransformers (optional, richer embeddings)
# ---------------------------------------------------------------------------
class STEmbedder:
    _MODEL_NAME = "all-MiniLM-L6-v2"

    def __init__(self):
        from sentence_transformers import SentenceTransformer
        self._model = SentenceTransformer(self._MODEL_NAME)
        logger.info("SentenceTransformer loaded: %s", self._MODEL_NAME)

    def embed(self, text: str) -> list[float]:
        return self._model.encode(text, normalize_embeddings=True).tolist()

    def similarity(self, a: list[float], b: list[float]) -> float:
        return sum(x * y for x, y in zip(a, b))


def get_embedder() -> Embedder:
    try:
        return STEmbedder()
    except Exception:
        logger.info("sentence-transformers not available, using TF-IDF embedder")
        return TFIDFEmbedder()


_embedder: Embedder | None = None


def embedder() -> Embedder:
    global _embedder
    if _embedder is None:
        _embedder = get_embedder()
    return _embedder
