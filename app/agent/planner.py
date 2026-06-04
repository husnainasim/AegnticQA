import os
from dataclasses import dataclass

import anthropic

from app.models.response import TokenUsage


@dataclass
class ToolCallRequest:
    id: str
    name: str
    inputs: dict


@dataclass
class PlannerResponse:
    stop_reason: str
    content: list
    tool_calls: list[ToolCallRequest]
    text_response: str | None
    usage: TokenUsage


class Planner:
    def __init__(
        self,
        model: str | None = None,
        max_tokens: int = 1024,
        client: anthropic.AsyncAnthropic | None = None,
    ):
        self.model = model or os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")
        self.max_tokens = max_tokens
        self.client = client or anthropic.AsyncAnthropic(
            api_key=os.getenv("ANTHROPIC_API_KEY")
        )

    async def think(
        self, messages: list[dict], tools: list[dict], system: str
    ) -> PlannerResponse:
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=self.max_tokens,
            tools=tools,
            tool_choice={"type": "auto"},
            system=[
                {
                    "type": "text",
                    "text": system,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=messages,
        )

        tool_calls = [
            ToolCallRequest(id=block.id, name=block.name, inputs=block.input)
            for block in response.content
            if block.type == "tool_use"
        ]

        text_parts = [
            block.text
            for block in response.content
            if block.type == "text"
        ]
        text_response = " ".join(text_parts).strip() if text_parts else None

        usage = TokenUsage(
            prompt=response.usage.input_tokens,
            completion=response.usage.output_tokens,
        )

        return PlannerResponse(
            stop_reason=response.stop_reason,
            content=response.content,
            tool_calls=tool_calls,
            text_response=text_response,
            usage=usage,
        )
