"""
LiteLLM provider session for screenshot-to-code.

Routes to 100+ LLM providers (OpenAI, Anthropic, Google, Azure, Bedrock,
Ollama, etc.) via the litellm SDK. No proxy server needed.

Set LITELLM_MODEL to any litellm model string, e.g.:
  LITELLM_MODEL=anthropic/claude-sonnet-4-20250514
  LITELLM_MODEL=azure/gpt-4o
  LITELLM_MODEL=bedrock/anthropic.claude-3-haiku

See https://docs.litellm.ai/docs/providers for all supported models.
"""

import json
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from openai.types.chat import ChatCompletionMessageParam

from agent.providers.base import (
    EventSink,
    ExecutedToolCall,
    ProviderSession,
    ProviderTurn,
    StreamEvent,
)
from agent.providers.token_usage import TokenUsage
from agent.tools import CanonicalToolDefinition, ToolCall, parse_json_arguments
from agent.state import ensure_str


def serialize_litellm_tools(
    tools: List[CanonicalToolDefinition],
) -> List[Dict[str, Any]]:
    """Serialize tools to OpenAI chat completions format for litellm."""
    serialized: List[Dict[str, Any]] = []
    for tool in tools:
        serialized.append(
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.parameters,
                },
            }
        )
    return serialized


@dataclass
class LiteLLMParseState:
    assistant_text: str = ""
    tool_calls: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    turn_usage: Optional[TokenUsage] = None


class LiteLLMProviderSession(ProviderSession):
    def __init__(
        self,
        model: str,
        prompt_messages: List[ChatCompletionMessageParam],
        tools: List[Dict[str, Any]],
        api_key: Optional[str] = None,
    ):
        self._model = model
        self._tools = tools
        self._api_key = api_key
        self._total_usage = TokenUsage()
        self._messages: List[Dict[str, Any]] = list(prompt_messages)  # type: ignore[arg-type]

    async def stream_turn(self, on_event: EventSink) -> ProviderTurn:
        try:
            import litellm
        except ImportError:
            raise ImportError(
                "litellm is required for the LiteLLM provider. "
                "Install with: pip install litellm"
            )

        params: Dict[str, Any] = {
            "model": self._model,
            "messages": self._messages,
            "stream": True,
            "drop_params": True,
            "max_tokens": 16384,
        }
        if self._tools:
            params["tools"] = self._tools
            params["tool_choice"] = "auto"
        if self._api_key:
            params["api_key"] = self._api_key

        state = LiteLLMParseState()
        response = await litellm.acompletion(**params)

        async for chunk in response:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta is None:
                continue

            if delta.content:
                state.assistant_text += delta.content
                await on_event(StreamEvent(type="assistant_delta", text=delta.content))

            if delta.tool_calls:
                for tc in delta.tool_calls:
                    idx = str(tc.index) if hasattr(tc, "index") else "0"
                    entry = state.tool_calls.setdefault(
                        idx,
                        {"id": "", "name": "", "arguments": ""},
                    )
                    if tc.id:
                        entry["id"] = tc.id
                    if tc.function:
                        if tc.function.name:
                            entry["name"] = tc.function.name
                        if tc.function.arguments:
                            entry["arguments"] += tc.function.arguments
                            await on_event(
                                StreamEvent(
                                    type="tool_call_delta",
                                    tool_call_id=entry["id"],
                                    tool_name=entry["name"],
                                    tool_arguments=entry["arguments"],
                                )
                            )

            if hasattr(chunk, "usage") and chunk.usage:
                u = chunk.usage
                state.turn_usage = TokenUsage(
                    input=getattr(u, "prompt_tokens", 0) or 0,
                    output=getattr(u, "completion_tokens", 0) or 0,
                    total=getattr(u, "total_tokens", 0) or 0,
                )

        if state.turn_usage:
            self._total_usage.accumulate(state.turn_usage)

        tool_calls: List[ToolCall] = []
        for entry in state.tool_calls.values():
            args, error = parse_json_arguments(entry.get("arguments"))
            if error:
                args = {"INVALID_JSON": ensure_str(entry.get("arguments"))}
            tool_calls.append(
                ToolCall(
                    id=entry.get("id") or f"call-{uuid.uuid4().hex[:6]}",
                    name=entry.get("name") or "unknown_tool",
                    arguments=args,
                )
            )

        assistant_msg: Dict[str, Any] = {
            "role": "assistant",
            "content": state.assistant_text or None,
        }
        if tool_calls:
            assistant_msg["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {"name": tc.name, "arguments": json.dumps(tc.arguments)},
                }
                for tc in tool_calls
            ]

        return ProviderTurn(
            assistant_text=state.assistant_text,
            tool_calls=tool_calls,
            assistant_turn=assistant_msg,
        )

    def append_tool_results(
        self,
        turn: ProviderTurn,
        executed_tool_calls: list[ExecutedToolCall],
    ) -> None:
        if turn.assistant_turn:
            self._messages.append(turn.assistant_turn)

        for executed in executed_tool_calls:
            self._messages.append(
                {
                    "role": "tool",
                    "tool_call_id": executed.tool_call.id,
                    "content": json.dumps(executed.result.result),
                }
            )

    async def close(self) -> None:
        u = self._total_usage
        print(
            f"[TOKEN USAGE] provider=litellm model={self._model} | "
            f"input={u.input} output={u.output} total={u.total}"
        )
