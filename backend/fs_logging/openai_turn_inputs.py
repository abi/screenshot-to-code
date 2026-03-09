# pyright: reportUnknownVariableType=false
import json
import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from html import escape
from typing import Any, Sequence

from agent.providers.pricing import MODEL_PRICING
from agent.providers.token_usage import TokenUsage
from agent.state import ensure_str
from llm import Llm, get_openai_api_name


def _truncate_for_log(value: Any, max_len: int = 120) -> str:
    text = ensure_str(value).replace("\n", "\\n")
    if len(text) <= max_len:
        return text
    return f"{text[:max_len]}..."


def _as_dict(value: Any) -> dict[str, Any] | None:
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
            part_summaries = [_summarize_content_part(part) for part in content]
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
            part_summaries = [_summarize_content_part(part) for part in content]
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
            summary_parts = [_summarize_content_part(part) for part in summary]
            return (
                f"{index:02d} type=reasoning summary_parts={len(summary)} "
                f"[{'; '.join(summary_parts)}]"
            )
        return f"{index:02d} type=reasoning summary_type={type(summary).__name__}"

    return f"{index:02d} type={item_type} keys={sorted(item_dict.keys())}"


def _log_openai_turn_input(model: Llm, turn_index: int, input_items: Sequence[Any]) -> None:
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


@dataclass
class OpenAITurnInputItem:
    index: int
    summary: str
    payload: Any


@dataclass
class OpenAITurnUsageSummary:
    input_tokens: int
    output_tokens: int
    cache_read: int
    cache_write: int
    total_tokens: int
    cache_hit_rate_percent: float
    cost_usd: float | None


@dataclass
class OpenAITurnInputReport:
    turn_index: int
    items: list[OpenAITurnInputItem]
    usage: OpenAITurnUsageSummary | None = None


@dataclass
class OpenAITurnInputLogger:
    model: Llm
    enabled: bool = False
    report_id: str = field(default_factory=lambda: uuid.uuid4().hex)
    _turn_index: int = 0
    _turns: list[OpenAITurnInputReport] = field(default_factory=list)

    def record_turn_input(self, input_items: Sequence[Any]) -> None:
        if not self.enabled:
            return

        self._turn_index += 1
        if _is_openai_turn_input_console_enabled():
            _log_openai_turn_input(self.model, self._turn_index, input_items)

        turn_items = [
            OpenAITurnInputItem(
                index=index,
                summary=_summarize_responses_input_item(index, item),
                payload=_truncate_nested_strings(_to_serializable(item)),
            )
            for index, item in enumerate(input_items)
        ]
        self._turns.append(
            OpenAITurnInputReport(
                turn_index=self._turn_index,
                items=turn_items,
            )
        )

    def record_turn_usage(self, usage: TokenUsage) -> None:
        if not self.enabled or not self._turns:
            return

        pricing = MODEL_PRICING.get(get_openai_api_name(self.model))
        cost_usd = usage.cost(pricing) if pricing else None
        self._turns[-1].usage = OpenAITurnUsageSummary(
            input_tokens=usage.input,
            output_tokens=usage.output,
            cache_read=usage.cache_read,
            cache_write=usage.cache_write,
            total_tokens=usage.total,
            cache_hit_rate_percent=usage.cache_hit_rate_percent(),
            cost_usd=cost_usd,
        )

    def write_html_report(self) -> str | None:
        if not self.enabled:
            return None

        try:
            logs_path = os.environ.get("LOGS_PATH", os.getcwd())
            logs_directory = os.path.join(logs_path, "run_logs")
            os.makedirs(logs_directory, exist_ok=True)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            model_name = get_openai_api_name(self.model).replace("/", "_")
            filename = (
                f"openai_turn_inputs_{model_name}_{timestamp}_{self.report_id[:8]}.html"
            )
            filepath = os.path.join(logs_directory, filename)

            with open(filepath, "w", encoding="utf-8") as f:
                f.write(self._render_html_report())
            return filepath
        except Exception as e:
            print(f"[OPENAI TURN INPUT] Failed to write HTML report: {e}")
            return None

    def _render_html_report(self) -> str:
        model_name = get_openai_api_name(self.model)
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
            "    .usage-table { width: auto; min-width: 540px; margin-top: 10px; }",
            "    .usage-table th { width: 180px; }",
            "    .usage-none { margin-top: 10px; color: #6b7280; font-style: italic; }",
            "  </style>",
            "</head>",
            "<body>",
            "  <h1>OpenAI Turn Input Report</h1>",
            (
                "  <div class='meta'>"
                f"report_id={escape(self.report_id)} | "
                f"model={escape(model_name)} | turns={len(self._turns)}"
                "</div>"
            ),
        ]

        for turn in self._turns:
            html_parts.append("  <section class='turn'>")
            html_parts.append(
                f"    <h2>Turn {turn.turn_index} (items={len(turn.items)})</h2>"
            )
            if turn.usage is not None:
                cost_text = "n/a"
                if isinstance(turn.usage.cost_usd, (float, int)):
                    cost_text = f"${turn.usage.cost_usd:.4f}"

                html_parts.append("    <table class='usage-table'>")
                html_parts.append(
                    "      <thead><tr><th>Metric</th><th>Value</th></tr></thead>"
                )
                html_parts.append("      <tbody>")
                html_parts.append(
                    "        "
                    f"<tr><td>Input tokens</td><td>{turn.usage.input_tokens}</td></tr>"
                )
                html_parts.append(
                    "        "
                    f"<tr><td>Output tokens</td><td>{turn.usage.output_tokens}</td></tr>"
                )
                html_parts.append(
                    "        "
                    f"<tr><td>Cache read</td><td>{turn.usage.cache_read}</td></tr>"
                )
                html_parts.append(
                    "        "
                    f"<tr><td>Cache write</td><td>{turn.usage.cache_write}</td></tr>"
                )
                html_parts.append(
                    "        "
                    f"<tr><td>Total tokens</td><td>{turn.usage.total_tokens}</td></tr>"
                )
                html_parts.append(
                    "        <tr><td>Cache hit rate</td>"
                    f"<td>{turn.usage.cache_hit_rate_percent:.2f}%</td></tr>"
                )
                html_parts.append(
                    f"        <tr><td>Cost</td><td>{escape(cost_text)}</td></tr>"
                )
                html_parts.append("      </tbody>")
                html_parts.append("    </table>")
            else:
                html_parts.append(
                    "    <div class='usage-none'>Usage unavailable for this turn.</div>"
                )

            html_parts.append("    <table>")
            html_parts.append(
                "      <thead><tr><th style='width:70px'>Index</th><th>Summary</th></tr></thead>"
            )
            html_parts.append("      <tbody>")
            for item in turn.items:
                html_parts.append(
                    "        "
                    f"<tr><td>{item.index:02d}</td><td><code>{escape(item.summary)}</code></td></tr>"
                )
            html_parts.append("      </tbody>")
            html_parts.append("    </table>")

            for item in turn.items:
                payload_json = json.dumps(
                    item.payload,
                    indent=2,
                    ensure_ascii=False,
                    sort_keys=True,
                )
                html_parts.append("    <details>")
                html_parts.append(
                    f"      <summary>Item {item.index:02d} payload</summary>"
                )
                html_parts.append(f"      <pre>{escape(payload_json)}</pre>")
                html_parts.append("    </details>")
            html_parts.append("  </section>")

        html_parts.extend(["</body>", "</html>"])
        return "\n".join(html_parts)
