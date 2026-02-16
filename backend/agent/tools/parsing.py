# pyright: reportUnknownVariableType=false
import json
from typing import Any, Dict, Optional, Tuple

from agent.state import ensure_str


def parse_json_arguments(raw_args: Any) -> Tuple[Dict[str, Any], Optional[str]]:
    if isinstance(raw_args, dict):
        return raw_args, None
    if raw_args is None:
        return {}, None
    raw_text = ensure_str(raw_args).strip()
    if not raw_text:
        return {}, None
    try:
        return json.loads(raw_text), None
    except json.JSONDecodeError as exc:
        return {}, f"Invalid JSON arguments: {exc}"


def _strip_incomplete_escape(value: str) -> str:
    if not value:
        return value
    trailing = 0
    for ch in reversed(value):
        if ch == "\\":
            trailing += 1
        else:
            break
    if trailing % 2 == 1:
        return value[:-1]
    return value


def _extract_partial_json_string(raw_text: str, key: str) -> Optional[str]:
    if not raw_text:
        return None
    token = f'"{key}"'
    idx = raw_text.find(token)
    if idx == -1:
        return None
    colon = raw_text.find(":", idx + len(token))
    if colon == -1:
        return None
    cursor = colon + 1
    while cursor < len(raw_text) and raw_text[cursor].isspace():
        cursor += 1
    if cursor >= len(raw_text) or raw_text[cursor] != '"':
        return None

    start = cursor + 1
    last_quote: Optional[int] = None
    cursor = start
    while cursor < len(raw_text):
        if raw_text[cursor] == '"':
            backslashes = 0
            back = cursor - 1
            while back >= start and raw_text[back] == "\\":
                backslashes += 1
                back -= 1
            if backslashes % 2 == 0:
                last_quote = cursor
        cursor += 1

    partial = raw_text[start:] if last_quote is None else raw_text[start:last_quote]
    partial = _strip_incomplete_escape(partial)
    if not partial:
        return ""

    try:
        return json.loads(f'"{partial}"')
    except Exception:
        return (
            partial.replace("\\n", "\n")
            .replace("\\t", "\t")
            .replace("\\r", "\r")
            .replace('\\"', '"')
            .replace("\\\\", "\\")
        )


def extract_content_from_args(raw_args: Any) -> Optional[str]:
    if isinstance(raw_args, dict):
        content = raw_args.get("content")
        if content is None:
            return None
        return ensure_str(content)
    raw_text = ensure_str(raw_args)
    return _extract_partial_json_string(raw_text, "content")


def extract_path_from_args(raw_args: Any) -> Optional[str]:
    if isinstance(raw_args, dict):
        path = raw_args.get("path")
        return ensure_str(path) if path is not None else None
    raw_text = ensure_str(raw_args)
    return _extract_partial_json_string(raw_text, "path")
