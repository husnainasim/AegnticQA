from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    max_iterations: int = Field(default=5, ge=1, le=10)
    stream: bool = False
    session_id: str | None = None
    user_id: str | None = None
    evaluate: bool = False
