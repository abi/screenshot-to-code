# pyright: reportUnknownVariableType=false
import copy
import json
import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from html import escape
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
from agent.providers.pricing import MODEL_PRICING
from agent.providers.token_usage import TokenUsage
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


def _truncate_for_log(value: Any, max_len: int = 120) -> str:
    text = ensure_str(value).replace("\n", "\\n")
    if len(text) <= max_len:
        return text
    return f"{text[:max_len]}..."


def _as_dict(value: Any) -> Dict[str, Any] | None:
    if isinstance(value, dict):
        return value

    model_dump = getattr(value, "model_dump", None)
    if callable(model_dump):
        dumped = model_dump()
        if isinstance(dumped, dict):
            return dumped

    to_dict = getattr(value, "to_dict", None)
    if callable(to_dict):
        dumped = to_dict()
        if isinstance(dumped, dict):
            return dumped

    dict_method = getattr(value, "dict", None)
    if callable(dict_method):
        dumped = dict_method()
        if isinstance(dumped, dict):
            return dumped

    raw_dict = getattr(value, "__dict__", None)
    if isinstance(raw_dict, dict):
        normalized = {k: v for k, v in raw_dict.items() if not k.startswith("_")}
        if normalized:
            return normalized

    return None


def _to_serializable(value: Any) -> Any:
    if value is None or isinstance(value, (bool, int, float, str)):
        return value

    if isinstance(value, dict):
        return {ensure_str(k): _to_serializable(v) for k, v in value.items()}

    if isinstance(value, (list, tuple)):
        return [_to_serializable(v) for v in value]

    as_dict = _as_dict(value)
    if as_dict is not None:
        return _to_serializable(as_dict)

    return ensure_str(value)


def _truncate_nested_strings(value: Any, max_len: int = 400) -> Any:
    if isinstance(value, str):
        if len(value) <= max_len:
            return value
        return f"{value[:max_len]}... (truncated {len(value) - max_len} chars)"
    if isinstance(value, list):
        return [_truncate_nested_strings(v, max_len=max_len) for v in value]
    if isinstance(value, dict):
        return {
            ensure_str(k): _truncate_nested_strings(v, max_len=max_len)
            for k, v in value.items()
        }
    return value


def _summarize_content_part(part: Any) -> str:
    part_dict = _as_dict(part)
    if part_dict is None:
        return f"{type(part).__name__}"

    part_type = part_dict.get("type", "unknown")

    if part_type in ("input_text", "text", "output_text", "summary_text"):
        text = ensure_str(part_dict.get("text", ""))
        return (
            f"{part_type}(chars={len(text)} "
            f"preview='{_truncate_for_log(text, max_len=80)}')"
        )

    if part_type in ("input_image", "image_url"):
        image_url_value: Any = part_dict.get("image_url", "")
        detail: str | None = None
        if isinstance(image_url_value, dict):
            detail = ensure_str(image_url_value.get("detail", ""))
            image_url_value = image_url_value.get("url", "")
        else:
            detail = ensure_str(part_dict.get("detail", ""))

        url_text = ensure_str(image_url_value)
        detail_text = detail or "-"
        return (
            f"{part_type}(detail={detail_text} "
            f"url='{_truncate_for_log(url_text, max_len=80)}')"
        )

    return f"{part_type}(keys={sorted(part_dict.keys())})"


def _summarize_responses_input_item(index: int, item: Any) -> str:
    item_dict = _as_dict(item)
    if item_dict is None:
        return f"{index:02d} item_type={type(item).__name__}"

    if "role" in item_dict:
        role = ensure_str(item_dict.get("role", "unknown"))
        content = item_dict.get("content", "")
        if isinstance(content, str):
            return (
                f"{index:02d} role={role} content=str chars={len(content)} "
                f"preview='{_truncate_for_log(content)}'"
            )
        if isinstance(content, list):
            part_summaries = [
                _summarize_content_part(part)
                for part in content
            ]
            return (
                f"{index:02d} role={role} content_parts={len(content)} "
                f"[{'; '.join(part_summaries)}]"
            )
        return (
            f"{index:02d} role={role} content_type={type(content).__name__}"
        )

    item_type = ensure_str(item_dict.get("type", "unknown"))

    if item_type in ("function_call", "custom_tool_call"):
        raw_args = (
            item_dict.get("input")
            if item_type == "custom_tool_call"
            else item_dict.get("arguments")
        )
        args_text = ensure_str(raw_args or "")
        call_id = item_dict.get("call_id") or item_dict.get("id")
        return (
            f"{index:02d} type={item_type} name={item_dict.get('name')} "
            f"call_id={call_id} args_chars={len(args_text)} "
            f"preview='{_truncate_for_log(args_text)}'"
        )

    if item_type == "function_call_output":
        output_text = ensure_str(item_dict.get("output", ""))
        return (
            f"{index:02d} type=function_call_output call_id={item_dict.get('call_id')} "
            f"output_chars={len(output_text)} "
            f"preview='{_truncate_for_log(output_text)}'"
        )

    if item_type == "message":
        role = ensure_str(item_dict.get("role", "unknown"))
        content = item_dict.get("content", [])
        if isinstance(content, list):
            part_summaries = [
                _summarize_content_part(part)
                for part in content
            ]
            return (
                f"{index:02d} type=message role={role} parts={len(content)} "
                f"[{'; '.join(part_summaries)}]"
            )
        return (
            f"{index:02d} type=message role={role} "
            f"content_type={type(content).__name__}"
        )

    if item_type == "reasoning":
        summary = item_dict.get("summary")
        if isinstance(summary, list):
            summary_parts = [
                _summarize_content_part(part)
                for part in summary
            ]
            return (
                f"{index:02d} type=reasoning summary_parts={len(summary)} "
                f"[{'; '.join(summary_parts)}]"
            )
        return (
            f"{index:02d} type=reasoning summary_type={type(summary).__name__}"
        )

    return f"{index:02d} type={item_type} keys={sorted(item_dict.keys())}"


def _log_openai_turn_input(
    model: Llm,
    turn_index: int,
    input_items: List[Any],
) -> None:
    model_name = get_openai_api_name(model)
    print(
        f"[OPENAI TURN INPUT] model={model_name} "
        f"turn={turn_index} items={len(input_items)}"
    )
    for index, item in enumerate(input_items):
        print(
            f"[OPENAI TURN INPUT] "
            f"{_summarize_responses_input_item(index, item)}"
        )


def _is_openai_turn_input_console_enabled() -> bool:
    value = os.environ.get("OPENAI_TURN_INPUT_CONSOLE", "")
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _render_openai_turn_input_html(
    model_name: str,
    report_id: str,
    turns: List[Dict[str, Any]],
) -> str:
    html_parts = [
        "<!DOCTYPE html>",
        "<html lang='en'>",
        "<head>",
        "  <meta charset='UTF-8' />",
        "  <meta name='viewport' content='width=device-width, initial-scale=1.0' />",
        "  <title>OpenAI Turn Input Report</title>",
        "  <style>",
        "    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 24px; color: #111827; }",
        "    h1, h2, h3 { margin: 0 0 12px; }",
        "    .meta { margin-bottom: 18px; color: #4b5563; }",
        "    .turn { border: 1px solid #d1d5db; border-radius: 8px; padding: 14px; margin-bottom: 16px; }",
        "    table { width: 100%; border-collapse: collapse; margin-top: 8px; }",
        "    th, td { border: 1px solid #e5e7eb; padding: 8px; vertical-align: top; text-align: left; }",
        "    th { background: #f9fafb; }",
        "    code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }",
        "    details { margin-top: 10px; }",
        "    pre { background: #0b1020; color: #d1d5db; padding: 12px; border-radius: 8px; overflow: auto; max-height: 420px; }",
        "  </style>",
        "</head>",
        "<body>",
        f"  <h1>OpenAI Turn Input Report</h1>",
        f"  <div class='meta'>report_id={escape(report_id)} | model={escape(model_name)} | turns={len(turns)}</div>",
    ]

    for turn in turns:
        turn_index = turn.get("turn_index")
        items = turn.get("items", [])
        html_parts.append("  <section class='turn'>")
        html_parts.append(
            f"    <h2>Turn {turn_index} (items={len(items)})</h2>"
        )
        html_parts.append("    <table>")
        html_parts.append(
            "      <thead><tr><th style='width:70px'>Index</th><th>Summary</th></tr></thead>"
        )
        html_parts.append("      <tbody>")
        for item in items:
            item_index = item.get("index")
            summary = ensure_str(item.get("summary", ""))
            html_parts.append(
                f"        <tr><td>{item_index:02d}</td><td><code>{escape(summary)}</code></td></tr>"
            )
        html_parts.append("      </tbody>")
        html_parts.append("    </table>")

        for item in items:
            item_index = item.get("index")
            payload = item.get("payload")
            payload_json = json.dumps(payload, indent=2, ensure_ascii=False, sort_keys=True)
            html_parts.append("    <details>")
            html_parts.append(
                f"      <summary>Item {item_index:02d} payload</summary>"
            )
            html_parts.append(f"      <pre>{escape(payload_json)}</pre>")
            html_parts.append("    </details>")
        html_parts.append("  </section>")

    html_parts.extend(["</body>", "</html>"])
    return "\n".join(html_parts)


def _write_openai_turn_input_html_report(
    model: Llm,
    report_id: str,
    turns: List[Dict[str, Any]],
) -> str | None:
    try:
        logs_path = os.environ.get("LOGS_PATH", os.getcwd())
        logs_directory = os.path.join(logs_path, "run_logs")
        os.makedirs(logs_directory, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        model_name = get_openai_api_name(model).replace("/", "_")
        filename = f"openai_turn_inputs_{model_name}_{timestamp}_{report_id[:8]}.html"
        filepath = os.path.join(logs_directory, filename)

        html_content = _render_openai_turn_input_html(
            model_name=model_name,
            report_id=report_id,
            turns=turns,
        )
        with open(filepath, "w") as f:
            f.write(html_content)
        return filepath
    except Exception as e:
        print(f"[OPENAI TURN INPUT] Failed to write HTML report: {e}")
        return None


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
    turn_usage: TokenUsage | None = None


def _extract_openai_usage(response: Any) -> TokenUsage:
    """Extract unified token usage from an OpenAI Responses ``response.completed`` event.

    OpenAI includes cached tokens inside ``input_tokens``, so they are subtracted
    to get the non-cached input count.
    """
    usage = _get_event_attr(response, "usage")
    if usage is None:
        return TokenUsage()
    input_tokens = _get_event_attr(usage, "input_tokens", 0) or 0
    output_tokens = _get_event_attr(usage, "output_tokens", 0) or 0
    total_tokens = _get_event_attr(usage, "total_tokens", 0) or 0

    details = _get_event_attr(usage, "input_tokens_details") or {}
    cached_tokens = _get_event_attr(details, "cached_tokens", 0) or 0

    return TokenUsage(
        input=input_tokens - cached_tokens,
        output=output_tokens,
        cache_read=cached_tokens,
        cache_write=0,
        total=total_tokens,
    )


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
        if event_type == "response.completed":
            response = _get_event_attr(event, "response")
            if response:
                state.turn_usage = _extract_openai_usage(response)
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
        self._total_usage = TokenUsage()
        self._turn_index = 0
        self._turn_input_report_id = uuid.uuid4().hex
        self._turn_input_reports: List[Dict[str, Any]] = []
        self._input_items: List[Dict[str, Any]] = [
            _convert_message_to_responses_input(message) for message in prompt_messages
        ]

    async def stream_turn(self, on_event: EventSink) -> ProviderTurn:
        self._turn_index += 1
        if _is_openai_turn_input_console_enabled():
            _log_openai_turn_input(self._model, self._turn_index, self._input_items)
        turn_items: List[Dict[str, Any]] = []
        for index, item in enumerate(self._input_items):
            summary = _summarize_responses_input_item(index, item)
            payload = _truncate_nested_strings(_to_serializable(item))
            turn_items.append(
                {
                    "index": index,
                    "summary": summary,
                    "payload": payload,
                }
            )
        self._turn_input_reports.append(
            {
                "turn_index": self._turn_index,
                "items": turn_items,
            }
        )

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

        if state.turn_usage is not None:
            self._total_usage.accumulate(state.turn_usage)

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
        u = self._total_usage
        model_name = get_openai_api_name(self._model)
        pricing = MODEL_PRICING.get(model_name)
        cost_str = f" cost=${u.cost(pricing):.4f}" if pricing else ""
        cache_hit_rate_str = f" cache_hit_rate={u.cache_hit_rate_percent():.2f}%"
        print(
            f"[TOKEN USAGE] provider=openai model={model_name} | "
            f"input={u.input} output={u.output} "
            f"cache_read={u.cache_read} cache_write={u.cache_write} "
            f"total={u.total}{cache_hit_rate_str}{cost_str}"
        )
        report_path = _write_openai_turn_input_html_report(
            model=self._model,
            report_id=self._turn_input_report_id,
            turns=self._turn_input_reports,
        )
        if report_path:
            print(f"[OPENAI TURN INPUT] HTML report: {report_path}")
        await self._client.close()
