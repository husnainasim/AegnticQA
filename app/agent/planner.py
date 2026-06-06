import json
import os
from dataclasses import dataclass

from openai import AsyncOpenAI

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
        client: AsyncOpenAI | None = None,
    ):
        self.model = model or os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self.max_tokens = max_tokens
        self.client = client or AsyncOpenAI(
            api_key=os.getenv("GROQ_API_KEY"),
            base_url="https://api.groq.com/openai/v1",
        )

    async def think(
        self, messages: list[dict], tools: list[dict], system: str
    ) -> PlannerResponse:
        full_messages = [{"role": "system", "content": system}] + messages

        response = await self.client.chat.completions.create(
            model=self.model,
            max_tokens=self.max_tokens,
            tools=tools,
            tool_choice="auto",
            messages=full_messages,
        )

        message = response.choices[0].message
        finish_reason = response.choices[0].finish_reason

        tool_calls = []
        if message.tool_calls:
            for tc in message.tool_calls:
                tool_calls.append(
                    ToolCallRequest(
                        id=tc.id,
                        name=tc.function.name,
                        inputs=json.loads(tc.function.arguments),
                    )
                )

        text_response = message.content if message.content else None

        stop_reason = "tool_use" if finish_reason == "tool_calls" else "end_turn"

        usage = TokenUsage(
            prompt=response.usage.prompt_tokens,
            completion=response.usage.completion_tokens,
        )

        assistant_msg: dict = {"role": "assistant", "content": message.content or ""}
        if message.tool_calls:
            assistant_msg["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                }
                for tc in message.tool_calls
            ]

        return PlannerResponse(
            stop_reason=stop_reason,
            content=[assistant_msg],
            tool_calls=tool_calls,
            text_response=text_response,
            usage=usage,
        )
