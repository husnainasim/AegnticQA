"""Token cost estimation for Groq models."""

_PRICING: dict[str, dict[str, float]] = {
    "llama-3.3-70b-versatile": {"prompt": 0.00059, "completion": 0.00079},
    "llama-3.1-70b-versatile": {"prompt": 0.00059, "completion": 0.00079},
    "llama-3.1-8b-instant":    {"prompt": 0.00005, "completion": 0.00008},
    "mixtral-8x7b-32768":      {"prompt": 0.00024, "completion": 0.00024},
    "gemma2-9b-it":            {"prompt": 0.00020, "completion": 0.00020},
}
_DEFAULT = {"prompt": 0.00059, "completion": 0.00079}


def compute_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    pricing = _PRICING.get(model, _DEFAULT)
    return round(
        prompt_tokens / 1000 * pricing["prompt"]
        + completion_tokens / 1000 * pricing["completion"],
        8,
    )
