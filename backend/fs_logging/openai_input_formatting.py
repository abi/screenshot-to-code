# pyright: reportUnknownVariableType=false
import json
from typing import Any

from agent.state import ensure_str


def truncate_for_log(value: Any, max_len: int = 120) -> str:
    text = ensure_str(value).replace("\n", "\\n")
    if len(text) <= max_len:
        return text
    return f"{text[:max_len]}..."


def as_dict(value: Any) -> dict[str, Any] | None:
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


def to_serializable(value: Any) -> Any:
    if value is None or isinstance(value, (bool, int, float, str)):
        return value

    if isinstance(value, dict):
        return {ensure_str(k): to_serializable(v) for k, v in value.items()}

    if isinstance(value, (list, tuple)):
        return [to_serializable(v) for v in value]

    value_as_dict = as_dict(value)
    if value_as_dict is not None:
        return to_serializable(value_as_dict)

    return ensure_str(value)


def summarize_content_part(part: Any) -> str:
    part_dict = as_dict(part)
    if part_dict is None:
        return f"{type(part).__name__}"

    part_type = part_dict.get("type", "unknown")

    if part_type in ("input_text", "text", "output_text", "summary_text"):
        text = ensure_str(part_dict.get("text", ""))
        return (
            f"{part_type}(chars={len(text)} "
            f"preview='{truncate_for_log(text, max_len=80)}')"
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
            f"url='{truncate_for_log(url_text, max_len=80)}')"
        )

    return f"{part_type}(keys={sorted(part_dict.keys())})"


def summarize_function_call_output_payload(output_text: str) -> str:
    try:
        parsed = json.loads(output_text)
    except json.JSONDecodeError:
        return (
            f"output_chars={len(output_text)} "
            f"preview='{truncate_for_log(output_text)}'"
        )

    if not isinstance(parsed, dict):
        return (
            f"output_type={type(parsed).__name__} "
            f"preview='{truncate_for_log(parsed)}'"
        )

    if "error" in parsed:
        error_text = ensure_str(parsed.get("error"))
        return f"error='{truncate_for_log(error_text)}'"

    summary_parts: list[str] = []

    content_text = ensure_str(parsed.get("content"))
    if content_text:
        summary_parts.append(f"content='{truncate_for_log(content_text, max_len=80)}'")

    details = parsed.get("details")
    if isinstance(details, dict):
        path = ensure_str(details.get("path"))

        diff_text = details.get("diff")
        if (not path) and isinstance(diff_text, str) and diff_text:
            for line in diff_text.splitlines():
                if line.startswith("--- "):
                    path = line.removeprefix("--- ").strip()
                    break

        if path:
            summary_parts.append(f"path={path}")

        edits = details.get("edits")
        if isinstance(edits, list):
            summary_parts.append(f"edits={len(edits)}")

        content_length = details.get("contentLength")
        if isinstance(content_length, int):
            summary_parts.append(f"content_length={content_length}")

        first_changed_line = details.get("firstChangedLine")
        if isinstance(first_changed_line, int):
            summary_parts.append(f"first_changed_line={first_changed_line}")

        if isinstance(diff_text, str) and diff_text:
            diff_lines = diff_text.count("\n")
            summary_parts.append(f"diff_chars={len(diff_text)}")
            summary_parts.append(f"diff_lines={diff_lines}")

    if not summary_parts:
        summary_parts.append(f"keys={sorted(parsed.keys())}")

    return " ".join(summary_parts)


def summarize_responses_input_item(index: int, item: Any) -> str:
    item_dict = as_dict(item)
    if item_dict is None:
        return f"{index:02d} item_type={type(item).__name__}"

    if "role" in item_dict:
        role = ensure_str(item_dict.get("role", "unknown"))
        content = item_dict.get("content", "")
        if isinstance(content, str):
            return (
                f"{index:02d} role={role} content=str chars={len(content)} "
                f"preview='{truncate_for_log(content)}'"
            )
        if isinstance(content, list):
            part_summaries = [summarize_content_part(part) for part in content]
            return (
                f"{index:02d} role={role} content_parts={len(content)} "
                f"[{'; '.join(part_summaries)}]"
            )
        return f"{index:02d} role={role} content_type={type(content).__name__}"

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
            f"preview='{truncate_for_log(args_text)}'"
        )

    if item_type == "function_call_output":
        output_text = ensure_str(item_dict.get("output", ""))
        return (
            f"{index:02d} type=function_call_output call_id={item_dict.get('call_id')} "
            f"{summarize_function_call_output_payload(output_text)}"
        )

    if item_type == "message":
        role = ensure_str(item_dict.get("role", "unknown"))
        content = item_dict.get("content", [])
        if isinstance(content, list):
            part_summaries = [summarize_content_part(part) for part in content]
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
            summary_parts = [summarize_content_part(part) for part in summary]
            return (
                f"{index:02d} type=reasoning summary_parts={len(summary)} "
                f"[{'; '.join(summary_parts)}]"
            )
        return f"{index:02d} type=reasoning summary_type={type(summary).__name__}"

    return f"{index:02d} type={item_type} keys={sorted(item_dict.keys())}"
