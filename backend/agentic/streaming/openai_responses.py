# pyright: reportUnknownVariableType=false
import json
import uuid
from typing import Any, Dict, List

from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam

from agentic.state import ensure_str
from agentic.streaming.types import EventSink, ExecutedToolCall, StepResult, StreamEvent
from agentic.tools import ToolCall, parse_json_arguments
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
                        "detail": image_url.get("detail", "auto"),
                    }
                )

    return {"role": role, "content": parts}


def _get_event_attr(event: Any, key: str, default: Any = None) -> Any:
    if hasattr(event, key):
        return getattr(event, key)
    if isinstance(event, dict):
        return event.get(key, default)
    return default


class OpenAIResponsesAdapter:
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
            _convert_message_to_responses_input(m) for m in prompt_messages
        ]

    async def run_step(self, on_event: EventSink) -> StepResult:
        assistant_text = ""
        tool_calls: Dict[str, Dict[str, Any]] = {}
        item_to_call_id: Dict[str, str] = {}
        output_items_by_index: Dict[int, Dict[str, Any]] = {}

        params: Dict[str, Any] = {
            "model": get_openai_api_name(self._model),
            "input": self._input_items,
            "tools": self._tools,
            "tool_choice": "auto",
            "stream": True,
            "max_output_tokens": 30000,
        }

        reasoning_effort = get_openai_reasoning_effort(self._model)
        if reasoning_effort:
            params["reasoning"] = {"effort": reasoning_effort}

        responses_client = getattr(self._client, "responses", None)
        if responses_client is None:
            raise Exception(
                "OpenAI SDK is too old for GPT-5.2 Codex. Please upgrade the 'openai' package to a version that supports the Responses API."
            )

        stream = await responses_client.create(**params)  # type: ignore

        async for event in stream:  # type: ignore
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
                        output_items_by_index[output_index] = item
                continue

            if event_type == "response.output_text.delta":
                delta = _get_event_attr(event, "delta", "")
                if delta:
                    assistant_text += delta
                    await on_event(StreamEvent(type="assistant_delta", text=delta))
                continue

            if event_type in (
                "response.reasoning_text.delta",
                "response.reasoning_summary_text.delta",
            ):
                delta = _get_event_attr(event, "delta", "")
                if delta:
                    await on_event(StreamEvent(type="thinking_delta", text=delta))
                continue

            if event_type in (
                "response.reasoning_summary_part.added",
                "response.reasoning_summary_part.done",
            ):
                part = _get_event_attr(event, "part") or {}
                text = _get_event_attr(part, "text", "")
                if text:
                    await on_event(StreamEvent(type="thinking_delta", text=text))
                continue

            if event_type == "response.output_item.added":
                item = _get_event_attr(event, "item")
                item_type = _get_event_attr(item, "type") if item else None
                output_index = _get_event_attr(event, "output_index")
                if isinstance(output_index, int) and item:
                    output_items_by_index.setdefault(output_index, item)

                if item and item_type in ("function_call", "custom_tool_call"):
                    item_id = _get_event_attr(item, "id")
                    call_id = _get_event_attr(item, "call_id") or item_id
                    if item_id and call_id:
                        item_to_call_id[item_id] = call_id
                    if call_id:
                        if item_id and item_id in tool_calls and item_id != call_id:
                            existing = tool_calls.pop(item_id)
                            tool_calls[call_id] = {
                                **existing,
                                "id": call_id,
                            }
                        args_value = _get_event_attr(item, "arguments")
                        if args_value is None and item_type == "custom_tool_call":
                            args_value = _get_event_attr(item, "input")
                        tool_calls.setdefault(
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
                continue

            if event_type in (
                "response.function_call_arguments.delta",
                "response.mcp_call_arguments.delta",
                "response.custom_tool_call_input.delta",
            ):
                item_id = _get_event_attr(event, "item_id")
                call_id = _get_event_attr(event, "call_id")
                if call_id and item_id:
                    item_to_call_id[item_id] = call_id
                if not call_id:
                    call_id = item_to_call_id.get(item_id) if item_id else None
                if not call_id and item_id:
                    call_id = item_id
                if not call_id:
                    continue

                entry = tool_calls.setdefault(
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
                continue

            if event_type in (
                "response.function_call_arguments.done",
                "response.mcp_call_arguments.done",
                "response.custom_tool_call_input.done",
            ):
                item_id = _get_event_attr(event, "item_id")
                call_id = _get_event_attr(event, "call_id")
                if call_id and item_id:
                    item_to_call_id[item_id] = call_id
                if not call_id:
                    call_id = item_to_call_id.get(item_id) if item_id else None
                if not call_id and item_id:
                    call_id = item_id
                if not call_id:
                    continue

                entry = tool_calls.setdefault(
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
                    and isinstance(output_items_by_index.get(output_index), dict)
                ):
                    output_items_by_index[output_index] = {
                        **output_items_by_index[output_index],
                        "arguments": entry["arguments"],
                        "call_id": call_id,
                        "name": entry.get("name"),
                    }

        output_items = [
            output_items_by_index[idx]
            for idx in sorted(output_items_by_index.keys())
            if output_items_by_index.get(idx)
        ]

        tool_items = [
            item
            for item in output_items
            if isinstance(item, dict)
            and item.get("type") in ("function_call", "custom_tool_call")
        ]

        tool_call_list: List[ToolCall] = []
        if tool_items:
            for item in tool_items:
                raw_args = item.get("arguments")
                if raw_args is None and item.get("type") == "custom_tool_call":
                    raw_args = item.get("input")
                args, error = parse_json_arguments(raw_args)
                if error:
                    args = {"_raw": raw_args}
                call_id = item.get("call_id") or item.get("id")
                tool_call_list.append(
                    ToolCall(
                        id=call_id or f"call-{uuid.uuid4().hex[:6]}",
                        name=item.get("name") or "unknown_tool",
                        arguments=args,
                    )
                )
        else:
            for entry in tool_calls.values():
                args, error = parse_json_arguments(entry.get("arguments"))
                if error:
                    args = {"_raw": entry.get("arguments")}
                call_id = entry.get("id") or entry.get("call_id")
                tool_call_list.append(
                    ToolCall(
                        id=call_id or f"call-{uuid.uuid4().hex[:6]}",
                        name=entry.get("name") or "unknown_tool",
                        arguments=args,
                    )
                )

        provider_state = None
        if tool_call_list:
            provider_state = {
                "output_items": output_items,
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
        output_items = provider_state.get("output_items") or []

        tool_output_items: List[Dict[str, Any]] = []
        for executed in executed_tool_calls:
            tool_output_items.append(
                {
                    "type": "function_call_output",
                    "call_id": executed.tool_call.id,
                    "output": json.dumps(executed.result.result),
                }
            )

        self._input_items.extend(output_items)
        self._input_items.extend(tool_output_items)
