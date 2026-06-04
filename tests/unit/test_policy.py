import pytest
from app.agent.policy import PolicyEngine, PolicyViolation


def test_clean_query_passes():
    PolicyEngine.check_query("What is the weather in Paris?")  # no exception


def test_blocked_domain_in_query_raises():
    import os
    os.environ["BLOCKED_DOMAINS"] = "evil.com,spam.net"
    with pytest.raises(PolicyViolation) as exc_info:
        PolicyEngine.check_query("Tell me about evil.com")
    assert "evil.com" in str(exc_info.value.reason)


def test_localhost_url_blocked():
    assert PolicyEngine.check_url("http://localhost/path") is False


def test_loopback_url_blocked():
    assert PolicyEngine.check_url("http://127.0.0.1/admin") is False


def test_valid_url_allowed():
    assert PolicyEngine.check_url("https://en.wikipedia.org/wiki/Paris") is True
