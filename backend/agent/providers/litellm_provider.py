import copy
import json
import uuid
from typing import Any, AsyncIterator, Dict, List, Optional

import litellm
from openai.types.chat import ChatCompletionMessageParam

from agent.providers.base import (
    EventSink,
    ExecutedToolCall,
    ProviderTurn,
    StreamEvent,
)
from agent.tools import CanonicalToolDefinition, ToolCall, parse_json_arguments


def serialize_litellm_tools(tools: List[CanonicalToolDefinition]) -> List[Dict[str, Any]]:
    return [
        {
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": copy.deepcopy(tool.parameters),
            },
        }
        for tool in tools
    ]


class LiteLLMProviderSession:
    def __init__(
        self,
        model_string: str,
        prompt_messages: List[ChatCompletionMessageParam],
        tools: List[Dict[str, Any]],
        api_key: Optional[str] = None,
        api_base: Optional[str] = None,
    ):
        self._model_string = model_string
        self._tools = tools
        self._api_key = api_key
        self._api_base = api_base
        self._total_input_tokens = 0
        self._total_output_tokens = 0

        # Conversation history in standard chat-completions format.
        # We copy so we don't mutate the caller's list.
        self._messages: List[Dict[str, Any]] = [dict(m) for m in prompt_messages]

    async def stream_turn(self, on_event: EventSink) -> ProviderTurn:
        kwargs: Dict[str, Any] = {
            "model": self._model_string,
            "messages": self._messages,
            "tools": self._tools,
            "stream": True,
        }
        if self._api_key:
            kwargs["api_key"] = self._api_key
        if self._api_base:
            kwargs["api_base"] = self._api_base

        response: AsyncIterator[Any] = await litellm.acompletion(**kwargs)  # type: ignore[assignment]

        assistant_text = ""
        # index -> {id, name, arguments}
        tool_call_fragments: Dict[int, Dict[str, Any]] = {}

        async for chunk in response:
            # Collect token usage when available (last chunk)
            usage = getattr(chunk, "usage", None)
            if usage:
                self._total_input_tokens += getattr(usage, "prompt_tokens", 0) or 0
                self._total_output_tokens += getattr(usage, "completion_tokens", 0) or 0

            choices = getattr(chunk, "choices", None)
            if not choices:
                continue
            delta = getattr(choices[0], "delta", None)
            if delta is None:
                continue

            # Text delta
            content = getattr(delta, "content", None)
            if content:
                assistant_text += content
                await on_event(StreamEvent(type="assistant_delta", text=content))

            # Tool call deltas (index-based accumulation)
            tc_deltas = getattr(delta, "tool_calls", None)
            if tc_deltas:
                for tc_delta in tc_deltas:
                    idx = tc_delta.index
                    if idx not in tool_call_fragments:
                        tool_call_fragments[idx] = {
                            "id": tc_delta.id or f"tool-{uuid.uuid4().hex[:6]}",
                            "name": "",
                            "arguments": "",
                        }

                    frag = tool_call_fragments[idx]
                    if tc_delta.id:
                        frag["id"] = tc_delta.id
                    fn = getattr(tc_delta, "function", None)
                    if fn:
                        if getattr(fn, "name", None):
                            frag["name"] = fn.name
                        args_chunk = getattr(fn, "arguments", None)
                        if args_chunk:
                            frag["arguments"] += args_chunk

                    await on_event(
                        StreamEvent(
                            type="tool_call_delta",
                            tool_call_id=frag["id"],
                            tool_name=frag["name"],
                            tool_arguments=frag["arguments"],
                        )
                    )

        # Build ToolCall list from accumulated fragments
        tool_calls: List[ToolCall] = []
        for idx in sorted(tool_call_fragments.keys()):
            frag = tool_call_fragments[idx]
            parsed_args, error = parse_json_arguments(frag["arguments"])
            if error:
                parsed_args = {"INVALID_JSON": frag["arguments"]}
            tool_calls.append(
                ToolCall(id=frag["id"], name=frag["name"], arguments=parsed_args)
            )

        # Build the assistant message to store in history.
        # We store it as assistant_turn so append_tool_results can use it.
        assistant_msg: Dict[str, Any] = {
            "role": "assistant",
            "content": assistant_text or None,
        }
        if tool_calls:
            assistant_msg["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.name,
                        "arguments": json.dumps(tc.arguments),
                    },
                }
                for tc in tool_calls
            ]

        return ProviderTurn(
            assistant_text=assistant_text,
            tool_calls=tool_calls,
            assistant_turn=assistant_msg,
        )

    def append_tool_results(
        self,
        turn: ProviderTurn,
        executed_tool_calls: list[ExecutedToolCall],
    ) -> None:
        # Append the assistant message that was constructed in stream_turn
        self._messages.append(turn.assistant_turn)

        # Append one tool result message per executed call
        for executed in executed_tool_calls:
            self._messages.append(
                {
                    "role": "tool",
                    "tool_call_id": executed.tool_call.id,
                    "content": json.dumps(executed.result.result),
                }
            )

    async def close(self) -> None:
        print(
            f"[TOKEN USAGE] provider=litellm model={self._model_string} | "
            f"input={self._total_input_tokens} output={self._total_output_tokens} "
            f"total={self._total_input_tokens + self._total_output_tokens}"
        )
