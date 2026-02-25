# pyright: reportUnknownVariableType=false
import base64
import copy
import io
import json
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, cast

from anthropic import AsyncAnthropic
from openai.types.chat import ChatCompletionMessageParam
from PIL import Image

from agent.providers.base import (
    EventSink,
    ExecutedToolCall,
    ProviderSession,
    ProviderTurn,
    StreamEvent,
)
from agent.tools import CanonicalToolDefinition, ToolCall, parse_json_arguments
from llm import Llm


CLAUDE_IMAGE_MAX_SIZE = 5 * 1024 * 1024
CLAUDE_MAX_IMAGE_DIMENSION = 7990

THINKING_MODELS = {
    Llm.CLAUDE_4_5_SONNET_2025_09_29.value,
    Llm.CLAUDE_4_5_OPUS_2025_11_01.value,
}
ADAPTIVE_THINKING_MODELS = {
    Llm.CLAUDE_OPUS_4_6.value,
    Llm.CLAUDE_SONNET_4_6.value,
}


def _process_image(image_data_url: str) -> tuple[str, str]:
    media_type = image_data_url.split(";")[0].split(":")[1]
    base64_data = image_data_url.split(",")[1]
    image_bytes = base64.b64decode(base64_data)

    img = Image.open(io.BytesIO(image_bytes))

    is_under_dimension_limit = (
        img.width < CLAUDE_MAX_IMAGE_DIMENSION
        and img.height < CLAUDE_MAX_IMAGE_DIMENSION
    )
    is_under_size_limit = len(base64_data) <= CLAUDE_IMAGE_MAX_SIZE

    if is_under_dimension_limit and is_under_size_limit:
        return (media_type, base64_data)

    start_time = time.time()

    if not is_under_dimension_limit:
        if img.width > img.height:
            new_width = CLAUDE_MAX_IMAGE_DIMENSION
            new_height = int((CLAUDE_MAX_IMAGE_DIMENSION / img.width) * img.height)
        else:
            new_height = CLAUDE_MAX_IMAGE_DIMENSION
            new_width = int((CLAUDE_MAX_IMAGE_DIMENSION / img.height) * img.width)

        img = img.resize((new_width, new_height), Image.DEFAULT_STRATEGY)

    quality = 95
    output = io.BytesIO()
    img = img.convert("RGB")
    img.save(output, format="JPEG", quality=quality)

    while (
        len(base64.b64encode(output.getvalue())) > CLAUDE_IMAGE_MAX_SIZE
        and quality > 10
    ):
        output = io.BytesIO()
        img.save(output, format="JPEG", quality=quality)
        quality -= 5

    end_time = time.time()
    processing_time = end_time - start_time
    print(f"[CLAUDE IMAGE PROCESSING] processing time: {processing_time:.2f} seconds")

    return ("image/jpeg", base64.b64encode(output.getvalue()).decode("utf-8"))


def _convert_openai_messages_to_claude(
    messages: List[ChatCompletionMessageParam],
) -> tuple[str, List[Dict[str, Any]]]:
    cloned_messages = copy.deepcopy(messages)

    system_prompt = cast(str, cloned_messages[0].get("content"))
    claude_messages = [dict(message) for message in cloned_messages[1:]]

    for message in claude_messages:
        if not isinstance(message["content"], list):
            continue

        for content in message["content"]:  # type: ignore
            if content["type"] != "image_url":
                continue

            content["type"] = "image"
            image_data_url = cast(str, content["image_url"]["url"])
            media_type, base64_data = _process_image(image_data_url)
            del content["image_url"]
            content["source"] = {
                "type": "base64",
                "media_type": media_type,
                "data": base64_data,
            }

    return system_prompt, claude_messages


def serialize_anthropic_tools(
    tools: List[CanonicalToolDefinition],
) -> List[Dict[str, Any]]:
    return [
        {
            "name": tool.name,
            "description": tool.description,
            "eager_input_streaming": True,
            "input_schema": copy.deepcopy(tool.parameters),
        }
        for tool in tools
    ]


@dataclass
class AnthropicParseState:
    assistant_text: str = ""
    tool_blocks: Dict[int, Dict[str, Any]] = field(default_factory=dict)
    tool_json_buffers: Dict[int, str] = field(default_factory=dict)


async def _parse_stream_event(
    event: Any,
    state: AnthropicParseState,
    on_event: EventSink,
) -> None:
    if event.type == "content_block_start":
        block = event.content_block
        if getattr(block, "type", None) != "tool_use":
            return

        tool_id = getattr(block, "id", None) or f"tool-{uuid.uuid4().hex[:6]}"
        tool_name = getattr(block, "name", None) or "unknown_tool"
        args = getattr(block, "input", None)
        state.tool_blocks[event.index] = {
            "id": tool_id,
            "name": tool_name,
        }
        state.tool_json_buffers[event.index] = ""
        if args:
            await on_event(
                StreamEvent(
                    type="tool_call_delta",
                    tool_call_id=tool_id,
                    tool_name=tool_name,
                    tool_arguments=args,
                )
            )
        return

    if event.type != "content_block_delta":
        return

    if event.delta.type == "thinking_delta":
        await on_event(StreamEvent(type="thinking_delta", text=event.delta.thinking))
        return

    if event.delta.type == "text_delta":
        state.assistant_text += event.delta.text
        await on_event(StreamEvent(type="assistant_delta", text=event.delta.text))
        return

    if event.delta.type != "input_json_delta":
        return

    partial_json = getattr(event.delta, "partial_json", None) or ""
    if not partial_json:
        return

    buffer = state.tool_json_buffers.get(event.index, "") + partial_json
    state.tool_json_buffers[event.index] = buffer
    meta = state.tool_blocks.get(event.index)
    if not meta:
        return

    await on_event(
        StreamEvent(
            type="tool_call_delta",
            tool_call_id=meta.get("id"),
            tool_name=meta.get("name"),
            tool_arguments=buffer,
        )
    )


def _extract_tool_calls(final_message: Any) -> List[ToolCall]:
    tool_calls: List[ToolCall] = []
    if final_message and final_message.content:
        for block in final_message.content:
            if block.type != "tool_use":
                continue
            raw_input = getattr(block, "input", {})
            args: Dict[str, Any]
            if isinstance(raw_input, dict):
                args = cast(Dict[str, Any], raw_input)
            else:
                parsed, error = parse_json_arguments(raw_input)
                if error:
                    args = {"INVALID_JSON": str(raw_input)}
                else:
                    args = parsed
            tool_calls.append(
                ToolCall(
                    id=block.id,
                    name=block.name,
                    arguments=args,
                )
            )
    return tool_calls


class AnthropicProviderSession(ProviderSession):
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
        system_prompt, claude_messages = _convert_openai_messages_to_claude(prompt_messages)
        self._system_prompt = system_prompt
        self._messages = claude_messages

    async def stream_turn(self, on_event: EventSink) -> ProviderTurn:
        stream_kwargs: Dict[str, Any] = {
            "model": self._model.value,
            "max_tokens": 50000,
            "system": self._system_prompt,
            "messages": self._messages,
            "tools": self._tools,
        }

        if self._model.value in ADAPTIVE_THINKING_MODELS:
            stream_kwargs["thinking"] = {
                "type": "adaptive",
            }
            effort = (
                "high"
                if self._model.value == Llm.CLAUDE_SONNET_4_6.value
                else "max"
            )
            stream_kwargs["output_config"] = {"effort": effort}
        elif self._model.value in THINKING_MODELS:
            stream_kwargs["thinking"] = {
                "type": "enabled",
                "budget_tokens": 10000,
            }
        else:
            stream_kwargs["temperature"] = 0.0

        state = AnthropicParseState()
        async with self._client.messages.stream(**stream_kwargs) as stream:
            async for event in stream:
                await _parse_stream_event(event, state, on_event)
            final_message = await stream.get_final_message()

        tool_calls = _extract_tool_calls(final_message)
        return ProviderTurn(
            assistant_text=state.assistant_text,
            tool_calls=tool_calls,
            assistant_turn=final_message,
        )

    def append_tool_results(
        self,
        turn: ProviderTurn,
        executed_tool_calls: list[ExecutedToolCall],
    ) -> None:
        assistant_blocks: List[Dict[str, Any]] = []
        if turn.assistant_text:
            assistant_blocks.append({"type": "text", "text": turn.assistant_text})

        for call in turn.tool_calls:
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

    async def close(self) -> None:
        await self._client.close()
