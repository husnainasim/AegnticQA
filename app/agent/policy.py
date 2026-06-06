import os
from urllib.parse import urlparse

_DEFAULT_BLOCKED = {"localhost", "127.0.0.1", "0.0.0.0", "::1"}


class PolicyViolation(Exception):
    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


class PolicyEngine:
    @staticmethod
    def _blocked_domains() -> set[str]:
        env_val = os.getenv("BLOCKED_DOMAINS", "")
        extra = {d.strip() for d in env_val.split(",") if d.strip()}
        return _DEFAULT_BLOCKED | extra

    @staticmethod
    def check_query(query: str) -> None:
        blocked = PolicyEngine._blocked_domains()
        lower = query.lower()
        for domain in blocked:
            if domain in lower:
                raise PolicyViolation(f"Query references blocked domain: {domain}")

    @staticmethod
    def check_url(url: str) -> bool:
        try:
            hostname = urlparse(url).hostname or ""
            return hostname not in PolicyEngine._blocked_domains()
        except Exception:
            return False

    @staticmethod
    def check_injection(query: str) -> None:
        from app.agent.guardrails import is_injection_attempt
        if is_injection_attempt(query):
            raise PolicyViolation("Prompt injection attempt detected")
