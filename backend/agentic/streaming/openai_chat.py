# pyright: reportUnknownVariableType=false
import json
import uuid
from typing import Any, Dict, List

from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionChunk, ChatCompletionMessageParam

from agentic.streaming.types import EventSink, ExecutedToolCall, StepResult, StreamEvent
from agentic.tools import ToolCall, parse_json_arguments
from llm import Llm, get_openai_api_name


class OpenAIChatAdapter:
    def __init__(
        self,
        client: AsyncOpenAI,
        model: Llm,
        prompt_messages: List[ChatCompletionMessageParam],
        tools: List[Dict[str, Any]],
    ):
        self._client = client
        self._model = model
        self._tools = tools
        self._messages: List[Dict[str, Any]] = [dict(m) for m in prompt_messages]

    async def run_step(self, on_event: EventSink) -> StepResult:
        assistant_text = ""
        tool_calls: Dict[int, Dict[str, Any]] = {}

        params: Dict[str, Any] = {
            "model": get_openai_api_name(self._model),
            "messages": self._messages,
            "tools": self._tools,
            "tool_choice": "auto",
            "temperature": 0,
            "stream": True,
            "max_tokens": 30000,
        }

        stream = await self._client.chat.completions.create(**params)

        async for chunk in stream:  # type: ignore
            assert isinstance(chunk, ChatCompletionChunk)
            if not chunk.choices:
                continue

            delta = chunk.choices[0].delta
            if delta.content:
                assistant_text += delta.content
                await on_event(StreamEvent(type="assistant_delta", text=delta.content))

            if not delta.tool_calls:
                continue

            for tc in delta.tool_calls:
                idx = tc.index or 0
                entry = tool_calls.setdefault(
                    idx,
                    {
                        "id": tc.id or f"tool-{idx}-{uuid.uuid4().hex[:6]}",
                        "name": None,
                        "arguments": "",
                    },
                )
                if tc.id:
                    entry["id"] = tc.id
                if tc.function and tc.function.name:
                    entry["name"] = tc.function.name
                if tc.function and tc.function.arguments:
                    entry["arguments"] += tc.function.arguments
                    await on_event(
                        StreamEvent(
                            type="tool_call_delta",
                            tool_call_id=entry["id"],
                            tool_name=entry.get("name"),
                            tool_arguments=entry.get("arguments"),
                        )
                    )

        tool_call_list: List[ToolCall] = []
        for entry in tool_calls.values():
            args, error = parse_json_arguments(entry.get("arguments"))
            if error:
                args = {"_raw": entry.get("arguments")}
            tool_call_id = entry.get("id") or f"tool-{uuid.uuid4().hex[:6]}"
            tool_call_list.append(
                ToolCall(
                    id=tool_call_id,
                    name=entry.get("name") or "unknown_tool",
                    arguments=args,
                )
            )

        provider_state = None
        if tool_call_list:
            provider_state = {
                "assistant_message": {
                    "role": "assistant",
                    "content": assistant_text or None,
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.name,
                                "arguments": json.dumps(tc.arguments),
                            },
                        }
                        for tc in tool_call_list
                    ],
                }
            }

        return StepResult(
            assistant_text=assistant_text,
            tool_calls=tool_call_list,
            provider_state=provider_state,
        )

    def apply_tool_results(
        self,
        step_result: StepResult,
        executed_tool_calls: list[ExecutedToolCall],
    ) -> None:
        provider_state = step_result.provider_state or {}
        assistant_message = provider_state.get("assistant_message")
        if assistant_message:
            self._messages.append(assistant_message)

        for executed in executed_tool_calls:
            self._messages.append(
                {
                    "role": "tool",
                    "tool_call_id": executed.tool_call.id,
                    "content": json.dumps(executed.result.result),
                }
            )
