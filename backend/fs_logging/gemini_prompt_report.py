# pyright: reportUnknownVariableType=false
import json
import os
import uuid
from datetime import datetime
from html import escape
from typing import Any, Sequence

from agent.state import ensure_str
from llm import Llm


def is_gemini_3_5_flash_model(model: Llm) -> bool:
    return model.value.startswith("gemini-3.5-flash ")


def _to_serializable(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return _to_serializable(value.model_dump(mode="json", exclude_none=True))
    if isinstance(value, dict):
        return {ensure_str(key): _to_serializable(child) for key, child in value.items()}
    if isinstance(value, list):
        return [_to_serializable(child) for child in value]
    if isinstance(value, tuple):
        return [_to_serializable(child) for child in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return ensure_str(value)


def _extract_part_text(part: Any) -> str:
    text = getattr(part, "text", None)
    if isinstance(text, str):
        return text
    if isinstance(part, dict):
        value = part.get("text")
        if isinstance(value, str):
            return value
    return ""


def _summarize_content(content: Any, index: int) -> str:
    role = getattr(content, "role", None)
    parts = getattr(content, "parts", None)
    if isinstance(content, dict):
        role = content.get("role", role)
        # ``parts`` is the legacy generateContent shape; ``content`` is the
        # Interactions API turn shape (a list of content blocks).
        parts = content.get("parts", content.get("content", parts))

    part_count = len(parts) if isinstance(parts, list) else 0
    text_preview = ""
    if isinstance(parts, list):
        for part in parts:
            text_preview = _extract_part_text(part).strip()
            if text_preview:
                break

    if len(text_preview) > 140:
        text_preview = f"{text_preview[:137]}..."

    suffix = f" text={text_preview!r}" if text_preview else ""
    return f"content[{index}] role={role or 'unknown'} parts={part_count}{suffix}"


def write_gemini_prompt_report(
    *,
    model: Llm,
    api_model_name: str,
    thinking_level: str,
    system_instruction: str,
    contents: Sequence[Any],
    config: Any,
) -> str | None:
    if not is_gemini_3_5_flash_model(model):
        return None

    try:
        logs_path = os.environ.get("LOGS_PATH", os.getcwd())
        logs_directory = os.path.join(logs_path, "run_logs")
        os.makedirs(logs_directory, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_id = uuid.uuid4().hex[:8]
        filename = (
            f"gemini_prompt_report_{api_model_name}_{timestamp}_{report_id}.html"
        )
        filepath = os.path.join(logs_directory, filename)

        payload = {
            "model": model.value,
            "api_model_name": api_model_name,
            "thinking_level": thinking_level,
            "system_instruction": system_instruction,
            "contents": _to_serializable(list(contents)),
            "config": _to_serializable(config),
        }
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(_render_html_report(payload))
        print(f"[GEMINI PROMPT REPORT] Wrote {filepath}")
        return filepath
    except Exception as e:
        print(f"[GEMINI PROMPT REPORT] Failed to write HTML report: {e}")
        return None


def _render_html_report(payload: dict[str, Any]) -> str:
    system_instruction = ensure_str(payload.get("system_instruction", ""))
    contents = payload.get("contents", [])
    contents_json = json.dumps(contents, indent=2, ensure_ascii=False)
    full_payload_json = json.dumps(payload, indent=2, ensure_ascii=False)
    summaries = []
    if isinstance(contents, list):
        summaries = [_summarize_content(content, index) for index, content in enumerate(contents)]

    html_parts = [
        "<!DOCTYPE html>",
        "<html lang='en'>",
        "<head>",
        "  <meta charset='UTF-8' />",
        "  <meta name='viewport' content='width=device-width, initial-scale=1.0' />",
        "  <title>Gemini 3.5 Flash Prompt Report</title>",
        "  <style>",
        "    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 24px; color: #111827; }",
        "    h1, h2 { margin: 0 0 12px; }",
        "    .meta { margin-bottom: 18px; color: #4b5563; }",
        "    section { border: 1px solid #d1d5db; border-radius: 8px; padding: 14px; margin-bottom: 16px; }",
        "    pre { background: #0b1020; color: #d1d5db; padding: 12px; border-radius: 8px; overflow: auto; max-height: 560px; white-space: pre-wrap; overflow-wrap: anywhere; }",
        "    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }",
        "    table { width: 100%; border-collapse: collapse; margin-top: 8px; }",
        "    th, td { border: 1px solid #e5e7eb; padding: 8px; vertical-align: top; text-align: left; }",
        "    th { background: #f9fafb; }",
        "  </style>",
        "</head>",
        "<body>",
        "  <h1>Gemini 3.5 Flash Prompt Report</h1>",
        (
            "  <div class='meta'>"
            f"model={escape(ensure_str(payload.get('model')))} | "
            f"api_model={escape(ensure_str(payload.get('api_model_name')))} | "
            f"thinking_level={escape(ensure_str(payload.get('thinking_level')))}"
            "</div>"
        ),
        "  <section>",
        "    <h2>System Instruction</h2>",
        f"    <pre>{escape(system_instruction)}</pre>",
        "  </section>",
        "  <section>",
        "    <h2>Contents Summary</h2>",
        "    <table>",
        "      <thead><tr><th style='width:80px'>Index</th><th>Summary</th></tr></thead>",
        "      <tbody>",
    ]

    for index, summary in enumerate(summaries):
        html_parts.append(
            f"        <tr><td>{index:02d}</td><td><code>{escape(summary)}</code></td></tr>"
        )

    html_parts.extend(
        [
            "      </tbody>",
            "    </table>",
            "  </section>",
            "  <section>",
            "    <h2>Contents JSON</h2>",
            f"    <pre>{escape(contents_json)}</pre>",
            "  </section>",
            "  <section>",
            "    <h2>Full Request Payload</h2>",
            f"    <pre>{escape(full_payload_json)}</pre>",
            "  </section>",
            "</body>",
            "</html>",
        ]
    )
    return "\n".join(html_parts)
