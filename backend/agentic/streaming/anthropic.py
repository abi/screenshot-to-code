import json
import uuid
from typing import Any, Dict, List

from anthropic import AsyncAnthropic
from openai.types.chat import ChatCompletionMessageParam

from agentic.streaming.types import EventSink, ExecutedToolCall, StepResult, StreamEvent
from agentic.tools import ToolCall
from llm import Llm
from agentic.streaming.providers.anthropic.transform import (
    convert_openai_messages_to_claude,
)


THINKING_MODELS = {
    Llm.CLAUDE_4_5_SONNET_2025_09_29.value,
    Llm.CLAUDE_4_5_OPUS_2025_11_01.value,
}


class AnthropicAdapter:
    def __init__(
        self,
        client: AsyncAnthropic,
        model: Llm,
        prompt_messages: List[ChatCompletionMessageParam],
        tools: List[Dict[str, Any]],
    ):
        self._client = client
        self._model = model
        self._tools = tools
        system_prompt, claude_messages = convert_openai_messages_to_claude(prompt_messages)
        self._system_prompt = system_prompt
        self._messages = claude_messages

    async def run_step(self, on_event: EventSink) -> StepResult:
        assistant_text = ""
        tool_blocks: Dict[int, Dict[str, Any]] = {}
        tool_json_buffers: Dict[int, str] = {}

        stream_kwargs: Dict[str, Any] = {
            "model": self._model.value,
            "max_tokens": 30000,
            "system": self._system_prompt,
            "messages": self._messages,
            "tools": self._tools,
        }

        if self._model.value in THINKING_MODELS:
            stream_kwargs["thinking"] = {
                "type": "enabled",
                "budget_tokens": 10000,
            }
        else:
            stream_kwargs["temperature"] = 0.0

        if hasattr(self._client, "beta") and hasattr(self._client.beta, "messages"):
            stream_client = self._client.beta.messages
        else:
            stream_client = self._client.messages

        try:
            stream_kwargs_with_betas = dict(stream_kwargs)
            stream_kwargs_with_betas["betas"] = ["fine-grained-tool-streaming-2025-05-14"]
            stream_ctx = stream_client.stream(**stream_kwargs_with_betas)
        except TypeError:
            stream_ctx = stream_client.stream(**stream_kwargs)

        async with stream_ctx as stream:
            async for event in stream:
                if event.type == "content_block_start":
                    block = event.content_block
                    if getattr(block, "type", None) == "tool_use":
                        tool_id = getattr(block, "id", None) or f"tool-{uuid.uuid4().hex[:6]}"
                        tool_name = getattr(block, "name", None) or "unknown_tool"
                        args = getattr(block, "input", None)
                        tool_blocks[event.index] = {
                            "id": tool_id,
                            "name": tool_name,
                        }
                        tool_json_buffers[event.index] = ""
                        if args:
                            await on_event(
                                StreamEvent(
                                    type="tool_call_delta",
                                    tool_call_id=tool_id,
                                    tool_name=tool_name,
                                    tool_arguments=args,
                                )
                            )
                    continue

                if event.type != "content_block_delta":
                    continue

                if event.delta.type == "thinking_delta":
                    await on_event(
                        StreamEvent(type="thinking_delta", text=event.delta.thinking)
                    )
                elif event.delta.type == "text_delta":
                    assistant_text += event.delta.text
                    await on_event(
                        StreamEvent(type="assistant_delta", text=event.delta.text)
                    )
                elif event.delta.type == "input_json_delta":
                    partial_json = getattr(event.delta, "partial_json", None) or ""
                    if not partial_json:
                        continue
                    buffer = tool_json_buffers.get(event.index, "") + partial_json
                    tool_json_buffers[event.index] = buffer
                    meta = tool_blocks.get(event.index)
                    if not meta:
                        continue
                    await on_event(
                        StreamEvent(
                            type="tool_call_delta",
                            tool_call_id=meta.get("id"),
                            tool_name=meta.get("name"),
                            tool_arguments=buffer,
                        )
                    )

            final_message = await stream.get_final_message()

        tool_calls: List[ToolCall] = []
        if final_message and final_message.content:
            for block in final_message.content:
                if block.type != "tool_use":
                    continue
                tool_calls.append(
                    ToolCall(
                        id=block.id,
                        name=block.name,
                        arguments=block.input,
                    )
                )

        return StepResult(assistant_text=assistant_text, tool_calls=tool_calls)

    def apply_tool_results(
        self,
        step_result: StepResult,
        executed_tool_calls: list[ExecutedToolCall],
    ) -> None:
        assistant_blocks: List[Dict[str, Any]] = []
        if step_result.assistant_text:
            assistant_blocks.append({"type": "text", "text": step_result.assistant_text})

        for call in step_result.tool_calls:
            assistant_blocks.append(
                {
                    "type": "tool_use",
                    "id": call.id,
                    "name": call.name,
                    "input": call.arguments,
                }
            )

        self._messages.append({"role": "assistant", "content": assistant_blocks})

        tool_result_blocks: List[Dict[str, Any]] = []
        for executed in executed_tool_calls:
            tool_result_blocks.append(
                {
                    "type": "tool_result",
                    "tool_use_id": executed.tool_call.id,
                    "content": json.dumps(executed.result.result),
                    "is_error": not executed.result.ok,
                }
            )

        self._messages.append({"role": "user", "content": tool_result_blocks})
