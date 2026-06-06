from pydantic import BaseModel, AnyHttpUrl


class Source(BaseModel):
    name: str
    url: AnyHttpUrl

    def model_post_init(self, __context):
        object.__setattr__(self, "url", str(self.url))


class LatencyBreakdown(BaseModel):
    total: int
    by_step: dict[str, int]


class TokenUsage(BaseModel):
    prompt: int
    completion: int


class QAResponse(BaseModel):
    answer: str
    sources: list[Source]
    latency_ms: LatencyBreakdown
    tokens: TokenUsage
    reasoning_trace: list[str] = []
    request_id: str = ""
    cost_usd: float = 0.0
    memories_used: list[str] = []
    session_id: str | None = None
    eval: dict | None = None
