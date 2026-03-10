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
from fs_logging.openai_input_formatting import (
    summarize_responses_input_item,
    to_serializable,
)
from llm import Llm, get_openai_api_name


def _render_json_scalar(value: Any) -> str:
    if value is None:
        return "<span class='json-null'>null</span>"
    if isinstance(value, bool):
        return f"<span class='json-bool'>{str(value).lower()}</span>"
    if isinstance(value, (int, float)):
        return f"<span class='json-number'>{escape(ensure_str(value))}</span>"
    text = ensure_str(value)
    if "\n" not in text and len(text) <= 160:
        return f"<code class='json-string'>{escape(text)}</code>"
    return (
        "<details class='json-string-block'>"
        f"<summary>string ({len(text)} chars)</summary>"
        f"<pre>{escape(text)}</pre>"
        "</details>"
    )


def _render_json_node(value: Any, label: str | None = None) -> str:
    label_html = ""
    if label is not None:
        label_html = f"<span class='json-key'>{escape(label)}</span>: "

    if isinstance(value, dict):
        parts = [
            "<details class='json-node'>",
            (
                f"<summary>{label_html}"
                f"<span class='json-type'>object ({len(value)} keys)</span></summary>"
            ),
            "<div class='json-children'>",
        ]
        for child_key, child_value in value.items():
            parts.append(_render_json_node(child_value, ensure_str(child_key)))
        parts.append("</div>")
        parts.append("</details>")
        return "".join(parts)

    if isinstance(value, list):
        parts = [
            "<details class='json-node'>",
            (
                f"<summary>{label_html}"
                f"<span class='json-type'>array ({len(value)} items)</span></summary>"
            ),
            "<div class='json-children'>",
        ]
        for index, child_value in enumerate(value):
            parts.append(_render_json_node(child_value, f"[{index}]"))
        parts.append("</div>")
        parts.append("</details>")
        return "".join(parts)

    return (
        "<div class='json-leaf'>"
        f"{label_html}{_render_json_scalar(value)}"
        "</div>"
    )


def _render_copy_controls(copy_target_id: str, button_label: str) -> str:
    return (
        "<div class='copy-controls'>"
        f"<button type='button' class='copy-button' data-copy-target='{escape(copy_target_id)}'>"
        f"{escape(button_label)}"
        "</button>"
        "<span class='copy-status' aria-live='polite'></span>"
        "</div>"
    )

def _log_openai_turn_input(model: Llm, turn_index: int, input_items: Sequence[Any]) -> None:
    model_name = get_openai_api_name(model)
    print(
        f"[OPENAI TURN INPUT] model={model_name} "
        f"turn={turn_index} items={len(input_items)}"
    )
    for index, item in enumerate(input_items):
        print(
            f"[OPENAI TURN INPUT] "
            f"{summarize_responses_input_item(index, item)}"
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
    request_payload: Any | None = None
    usage: OpenAITurnUsageSummary | None = None


@dataclass
class OpenAITurnInputLogger:
    model: Llm
    enabled: bool = False
    report_id: str = field(default_factory=lambda: uuid.uuid4().hex)
    _turn_index: int = 0
    _turns: list[OpenAITurnInputReport] = field(default_factory=list)

    def record_turn_input(
        self,
        input_items: Sequence[Any],
        request_payload: Any | None = None,
    ) -> None:
        if not self.enabled:
            return

        self._turn_index += 1
        if _is_openai_turn_input_console_enabled():
            _log_openai_turn_input(self.model, self._turn_index, input_items)

        turn_items = [
            OpenAITurnInputItem(
                index=index,
                summary=summarize_responses_input_item(index, item),
                payload=to_serializable(item),
            )
            for index, item in enumerate(input_items)
        ]
        self._turns.append(
            OpenAITurnInputReport(
                turn_index=self._turn_index,
                items=turn_items,
                request_payload=to_serializable(request_payload),
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
            "    .payload-wrap { margin-top: 10px; }",
            "    .json-view { margin-top: 8px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fcfcfd; }",
            "    .json-node, .json-string-block { margin: 6px 0; }",
            "    .json-node > summary, .json-string-block > summary { cursor: pointer; color: #1f2937; }",
            "    .json-children { margin-left: 16px; border-left: 1px solid #e5e7eb; padding-left: 10px; }",
            "    .json-leaf { margin: 6px 0; }",
            "    .json-key { color: #7c3aed; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }",
            "    .json-type { color: #2563eb; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }",
            "    .json-number, .json-bool, .json-null { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: #0f766e; }",
            "    .json-string { white-space: pre-wrap; overflow-wrap: anywhere; }",
            "    .copy-controls { display: flex; align-items: center; gap: 8px; margin-top: 10px; }",
            "    .copy-button { border: 1px solid #cbd5e1; background: #fff; color: #111827; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-size: 12px; }",
            "    .copy-button:hover { background: #f8fafc; }",
            "    .copy-status { color: #2563eb; font-size: 12px; min-height: 16px; }",
            "    .copy-source { display: none; }",
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
            if turn.request_payload is not None:
                request_payload_json = json.dumps(
                    turn.request_payload,
                    indent=2,
                    ensure_ascii=False,
                )
                request_input_json: str | None = None
                if isinstance(turn.request_payload, dict) and "input" in turn.request_payload:
                    request_input_json = json.dumps(
                        turn.request_payload["input"],
                        indent=2,
                        ensure_ascii=False,
                    )
                html_parts.append("    <details class='payload-wrap' open>")
                html_parts.append("      <summary>Request payload</summary>")
                if request_input_json is not None:
                    request_input_id = f"request-input-turn-{turn.turn_index}"
                    html_parts.append(
                        "      "
                        + _render_copy_controls(request_input_id, "Copy input JSON")
                    )
                    html_parts.append(
                        f"      <pre id='{escape(request_input_id)}' class='copy-source'>"
                        f"{escape(request_input_json)}</pre>"
                    )
                html_parts.append("      <div class='json-view'>")
                html_parts.append(_render_json_node(turn.request_payload, "root"))
                html_parts.append("      </div>")
                html_parts.append("      <details>")
                html_parts.append("        <summary>Raw JSON payload</summary>")
                html_parts.append(
                    f"        <pre>{escape(request_payload_json)}</pre>"
                )
                html_parts.append("      </details>")
                html_parts.append("    </details>")
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
                )
                html_parts.append("    <details class='payload-wrap'>")
                html_parts.append(
                    f"      <summary>Item {item.index:02d} payload</summary>"
                )
                html_parts.append("      <div class='json-view'>")
                html_parts.append(_render_json_node(item.payload, "root"))
                html_parts.append("      </div>")
                html_parts.append("      <details>")
                html_parts.append("        <summary>Raw JSON payload</summary>")
                html_parts.append(f"        <pre>{escape(payload_json)}</pre>")
                html_parts.append("      </details>")
                html_parts.append("    </details>")
            html_parts.append("  </section>")

        html_parts.extend(
            [
                "  <script>",
                "    document.addEventListener('click', async (event) => {",
                "      const target = event.target;",
                "      if (!(target instanceof HTMLButtonElement)) {",
                "        return;",
                "      }",
                "      const copyTargetId = target.dataset.copyTarget;",
                "      if (!copyTargetId) {",
                "        return;",
                "      }",
                "      const source = document.getElementById(copyTargetId);",
                "      const status = target.parentElement?.querySelector('.copy-status');",
                "      if (!source) {",
                "        if (status) { status.textContent = 'Missing source'; }",
                "        return;",
                "      }",
                "      try {",
                "        await navigator.clipboard.writeText(source.textContent || '');",
                "        if (status) { status.textContent = 'Copied'; }",
                "      } catch (_error) {",
                "        if (status) { status.textContent = 'Copy failed'; }",
                "      }",
                "      window.setTimeout(() => {",
                "        if (status) { status.textContent = ''; }",
                "      }, 1600);",
                "    });",
                "  </script>",
                "</body>",
                "</html>",
            ]
        )
        return "\n".join(html_parts)
