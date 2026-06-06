from app.observability.costs import compute_cost


def test_zero_tokens():
    assert compute_cost("llama-3.3-70b-versatile", 0, 0) == 0.0


def test_known_model_cost():
    cost = compute_cost("llama-3.3-70b-versatile", 1000, 500)
    # 1000 * 0.00059 + 500 * 0.00079 = 0.59 + 0.395 = 0.985 (in milli-dollars)
    assert cost == pytest.approx(0.00059 + 0.000395, rel=1e-4)


def test_unknown_model_uses_default():
    cost_known = compute_cost("llama-3.3-70b-versatile", 1000, 1000)
    cost_unknown = compute_cost("some-future-model", 1000, 1000)
    assert cost_unknown == cost_known


def test_cost_is_non_negative():
    assert compute_cost("llama-3.1-8b-instant", 500, 200) >= 0


import pytest
