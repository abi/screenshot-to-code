import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, cast

from agent.providers.types import EventSink, StreamEvent
from agent.tools import ToolCall, parse_json_arguments


@dataclass
class AnthropicParseState:
    assistant_text: str = ""
    tool_blocks: Dict[int, Dict[str, Any]] = field(default_factory=dict)
    tool_json_buffers: Dict[int, str] = field(default_factory=dict)


async def parse_stream_event(
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


def extract_tool_calls(final_message: Any) -> List[ToolCall]:
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
