# pyright: reportUnknownVariableType=false
import copy
import json
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List

from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam

from agent.providers.base import (
    EventSink,
    ExecutedToolCall,
    ProviderSession,
    ProviderTurn,
    StreamEvent,
)
from agent.state import ensure_str
from agent.tools import CanonicalToolDefinition, ToolCall, parse_json_arguments
from llm import Llm, get_openai_api_name, get_openai_reasoning_effort


def _convert_message_to_responses_input(
    message: ChatCompletionMessageParam,
) -> Dict[str, Any]:
    role = message.get("role", "user")
    content = message.get("content", "")

    if isinstance(content, str):
        return {"role": role, "content": content}

    parts: List[Dict[str, Any]] = []
    if isinstance(content, list):
        for part in content:
            if not isinstance(part, dict):
                continue
            if part.get("type") == "text":
                parts.append({"type": "input_text", "text": part.get("text", "")})
            elif part.get("type") == "image_url":
                image_url = part.get("image_url", {})
                parts.append(
                    {
                        "type": "input_image",
                        "image_url": image_url.get("url", ""),
                        "detail": image_url.get("detail", "high"),
                    }
                )

    return {"role": role, "content": parts}


def _get_event_attr(event: Any, key: str, default: Any = None) -> Any:
    if hasattr(event, key):
        return getattr(event, key)
    if isinstance(event, dict):
        return event.get(key, default)
    return default


def _copy_schema(schema: Dict[str, Any]) -> Dict[str, Any]:
    return copy.deepcopy(schema)


def _nullable_type(type_value: Any) -> Any:
    if isinstance(type_value, list):
        if "null" not in type_value:
            return [*type_value, "null"]
        return type_value
    if isinstance(type_value, str):
        return [type_value, "null"]
    return type_value


def _make_responses_schema_strict(schema: Dict[str, Any]) -> Dict[str, Any]:
    schema_copy: Dict[str, Any] = _copy_schema(schema)

    def transform(node: Dict[str, Any], in_object_property: bool = False) -> None:
        node_type = node.get("type")

        if node_type == "object":
            node["additionalProperties"] = False
            properties = node.get("properties") or {}
            if isinstance(properties, dict):
                node["required"] = list(properties.keys())
                for prop in properties.values():
                    if isinstance(prop, dict):
                        transform(prop, in_object_property=True)
            return

        if node_type == "array":
            if in_object_property:
                node["type"] = _nullable_type(node_type)
            items = node.get("items")
            if isinstance(items, dict):
                transform(items, in_object_property=False)
            return

        if in_object_property and node_type is not None:
            node["type"] = _nullable_type(node_type)

    transform(schema_copy, in_object_property=False)
    return schema_copy


def serialize_openai_tools(
    tools: List[CanonicalToolDefinition],
) -> List[Dict[str, Any]]:
    serialized: List[Dict[str, Any]] = []
    for tool in tools:
        schema = _make_responses_schema_strict(tool.parameters)
        serialized.append(
            {
                "type": "function",
                "name": tool.name,
                "description": tool.description,
                "parameters": schema,
                "strict": True,
            }
        )
    return serialized


@dataclass
class OpenAIResponsesParseState:
    assistant_text: str = ""
    tool_calls: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    item_to_call_id: Dict[str, str] = field(default_factory=dict)
    output_items_by_index: Dict[int, Dict[str, Any]] = field(default_factory=dict)
    saw_reasoning_summary_text_delta: bool = False
    last_emitted_reasoning_summary_part: str = ""


async def parse_event(
    event: Any,
    state: OpenAIResponsesParseState,
    on_event: EventSink,
) -> None:
    event_type = _get_event_attr(event, "type")
    if event_type in (
        "response.created",
        "response.completed",
        "response.done",
        "response.output_item.done",
    ):
        if event_type == "response.output_item.done":
            output_index = _get_event_attr(event, "output_index")
            item = _get_event_attr(event, "item")
            if isinstance(output_index, int) and item:
                state.output_items_by_index[output_index] = item
        return

    if event_type == "response.output_text.delta":
        delta = _get_event_attr(event, "delta", "")
        if delta:
            state.assistant_text += delta
            await on_event(StreamEvent(type="assistant_delta", text=delta))
        return

    if event_type in (
        "response.reasoning_text.delta",
        "response.reasoning_summary_text.delta",
    ):
        delta = _get_event_attr(event, "delta", "")
        if delta:
            if event_type == "response.reasoning_summary_text.delta":
                state.saw_reasoning_summary_text_delta = True
            await on_event(StreamEvent(type="thinking_delta", text=delta))
        return

    if event_type in (
        "response.reasoning_summary_part.added",
        "response.reasoning_summary_part.done",
    ):
        if state.saw_reasoning_summary_text_delta:
            return
        part = _get_event_attr(event, "part") or {}
        text = _get_event_attr(part, "text", "")
        if text and text != state.last_emitted_reasoning_summary_part:
            state.last_emitted_reasoning_summary_part = text
            await on_event(StreamEvent(type="thinking_delta", text=text))
        return

    if event_type == "response.output_item.added":
        item = _get_event_attr(event, "item")
        item_type = _get_event_attr(item, "type") if item else None
        output_index = _get_event_attr(event, "output_index")
        if isinstance(output_index, int) and item:
            state.output_items_by_index.setdefault(output_index, item)

        if item and item_type in ("function_call", "custom_tool_call"):
            item_id = _get_event_attr(item, "id")
            call_id = _get_event_attr(item, "call_id") or item_id
            if item_id and call_id:
                state.item_to_call_id[item_id] = call_id
            if call_id:
                if item_id and item_id in state.tool_calls and item_id != call_id:
                    existing = state.tool_calls.pop(item_id)
                    state.tool_calls[call_id] = {
                        **existing,
                        "id": call_id,
                    }
                args_value = _get_event_attr(item, "arguments")
                if args_value is None and item_type == "custom_tool_call":
                    args_value = _get_event_attr(item, "input")
                state.tool_calls.setdefault(
                    call_id,
                    {
                        "id": call_id,
                        "name": _get_event_attr(item, "name"),
                        "arguments": args_value or "",
                    },
                )
                if args_value:
                    await on_event(
                        StreamEvent(
                            type="tool_call_delta",
                            tool_call_id=call_id,
                            tool_name=_get_event_attr(item, "name"),
                            tool_arguments=args_value,
                        )
                    )
        return

    if event_type in (
        "response.function_call_arguments.delta",
        "response.mcp_call_arguments.delta",
        "response.custom_tool_call_input.delta",
    ):
        item_id = _get_event_attr(event, "item_id")
        call_id = _get_event_attr(event, "call_id")
        if call_id and item_id:
            state.item_to_call_id[item_id] = call_id
        if not call_id:
            call_id = state.item_to_call_id.get(item_id) if item_id else None
        if not call_id and item_id:
            call_id = item_id
        if not call_id:
            return

        entry = state.tool_calls.setdefault(
            call_id,
            {
                "id": call_id,
                "name": _get_event_attr(event, "name"),
                "arguments": "",
            },
        )
        delta_value = _get_event_attr(event, "delta")
        if delta_value is None:
            delta_value = _get_event_attr(event, "input")
        entry["arguments"] += ensure_str(delta_value)

        await on_event(
            StreamEvent(
                type="tool_call_delta",
                tool_call_id=call_id,
                tool_name=entry.get("name"),
                tool_arguments=entry.get("arguments"),
            )
        )
        return

    if event_type not in (
        "response.function_call_arguments.done",
        "response.mcp_call_arguments.done",
        "response.custom_tool_call_input.done",
    ):
        return

    item_id = _get_event_attr(event, "item_id")
    call_id = _get_event_attr(event, "call_id")
    if call_id and item_id:
        state.item_to_call_id[item_id] = call_id
    if not call_id:
        call_id = state.item_to_call_id.get(item_id) if item_id else None
    if not call_id and item_id:
        call_id = item_id
    if not call_id:
        return

    entry = state.tool_calls.setdefault(
        call_id,
        {
            "id": call_id,
            "name": _get_event_attr(event, "name"),
            "arguments": "",
        },
    )
    final_value = _get_event_attr(event, "arguments")
    if final_value is None:
        final_value = _get_event_attr(event, "input")
    if final_value is None:
        final_value = entry["arguments"]
    entry["arguments"] = final_value
    if _get_event_attr(event, "name"):
        entry["name"] = _get_event_attr(event, "name")

    await on_event(
        StreamEvent(
            type="tool_call_delta",
            tool_call_id=call_id,
            tool_name=entry.get("name"),
            tool_arguments=entry.get("arguments"),
        )
    )

    output_index = _get_event_attr(event, "output_index")
    if (
        item_id
        and isinstance(output_index, int)
        and isinstance(state.output_items_by_index.get(output_index), dict)
    ):
        state.output_items_by_index[output_index] = {
            **state.output_items_by_index[output_index],
            "arguments": entry["arguments"],
            "call_id": call_id,
            "name": entry.get("name"),
        }


def _build_provider_turn(state: OpenAIResponsesParseState) -> ProviderTurn:
    output_items = [
        state.output_items_by_index[idx]
        for idx in sorted(state.output_items_by_index.keys())
        if state.output_items_by_index.get(idx)
    ]

    tool_items = [
        item
        for item in output_items
        if isinstance(item, dict)
        and item.get("type") in ("function_call", "custom_tool_call")
    ]

    tool_calls: List[ToolCall] = []
    if tool_items:
        for item in tool_items:
            raw_args = item.get("arguments")
            if raw_args is None and item.get("type") == "custom_tool_call":
                raw_args = item.get("input")
            args, error = parse_json_arguments(raw_args)
            if error:
                args = {"INVALID_JSON": ensure_str(raw_args)}
            call_id = item.get("call_id") or item.get("id")
            tool_calls.append(
                ToolCall(
                    id=call_id or f"call-{uuid.uuid4().hex[:6]}",
                    name=item.get("name") or "unknown_tool",
                    arguments=args,
                )
            )
    else:
        for entry in state.tool_calls.values():
            args, error = parse_json_arguments(entry.get("arguments"))
            if error:
                args = {"INVALID_JSON": ensure_str(entry.get("arguments"))}
            call_id = entry.get("id") or entry.get("call_id")
            tool_calls.append(
                ToolCall(
                    id=call_id or f"call-{uuid.uuid4().hex[:6]}",
                    name=entry.get("name") or "unknown_tool",
                    arguments=args,
                )
            )

    assistant_turn: List[Dict[str, Any]] = output_items if tool_calls else []

    return ProviderTurn(
        assistant_text=state.assistant_text,
        tool_calls=tool_calls,
        assistant_turn=assistant_turn,
    )


class OpenAIProviderSession(ProviderSession):
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
        self._input_items: List[Dict[str, Any]] = [
            _convert_message_to_responses_input(message) for message in prompt_messages
        ]

    async def stream_turn(self, on_event: EventSink) -> ProviderTurn:
        params: Dict[str, Any] = {
            "model": get_openai_api_name(self._model),
            "input": self._input_items,
            "tools": self._tools,
            "tool_choice": "auto",
            "stream": True,
            "max_output_tokens": 50000,
        }
        reasoning_effort = get_openai_reasoning_effort(self._model)
        if reasoning_effort:
            params["reasoning"] = {"effort": reasoning_effort, "summary": "auto"}

        state = OpenAIResponsesParseState()
        stream = await self._client.responses.create(**params)  # type: ignore
        async for event in stream:  # type: ignore
            await parse_event(event, state, on_event)
        return _build_provider_turn(state)

    def append_tool_results(
        self,
        turn: ProviderTurn,
        executed_tool_calls: list[ExecutedToolCall],
    ) -> None:
        assistant_output_items = turn.assistant_turn or []
        if assistant_output_items:
            self._input_items.extend(assistant_output_items)

        tool_output_items: List[Dict[str, Any]] = []
        for executed in executed_tool_calls:
            tool_output_items.append(
                {
                    "type": "function_call_output",
                    "call_id": executed.tool_call.id,
                    "output": json.dumps(executed.result.result),
                }
            )
        self._input_items.extend(tool_output_items)

    async def close(self) -> None:
        await self._client.close()
