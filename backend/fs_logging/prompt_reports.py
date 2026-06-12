# pyright: reportUnknownVariableType=false
"""Unified on-disk prompt reports for LLM requests.

Every provider (OpenAI, Anthropic, Gemini) records the full request payload it
sends to the LLM API as one JSON file per request, plus token usage once the
turn completes. Reports are written to ``{LOGS_PATH}/run_logs/prompt_reports``
and are browsable from the frontend at ``/evals/prompt-reports``.

Gated by the ``PROMPT_REPORTS_ENABLED`` env var.
"""

import base64
import json
import os
import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any

from agent.providers.pricing import MODEL_PRICING
from agent.providers.token_usage import TokenUsage
from agent.state import ensure_str
from config import PROMPT_REPORTS_ENABLED
from llm import Llm

PROMPT_REPORT_FILENAME_PREFIX = "prompt_report_"
PROMPT_REPORT_FILENAME_PATTERN = re.compile(
    r"^prompt_report_(?P<date>\d{8})_(?P<time>\d{6})_(?P<session>[0-9a-f]{8})"
    r"_t(?P<turn>\d+)_(?P<provider>[a-z0-9]+)_(?P<model>[A-Za-z0-9.-]+)\.json$"
)


def get_run_logs_directory() -> str:
    logs_path = os.environ.get("LOGS_PATH", os.getcwd())
    return os.path.join(logs_path, "run_logs")


def get_prompt_reports_directory() -> str:
    return os.path.join(get_run_logs_directory(), "prompt_reports")


def _sanitize_model_name(model_name: str) -> str:
    return re.sub(r"[^A-Za-z0-9.-]+", "-", model_name).strip("-") or "unknown"


def to_serializable(value: Any) -> Any:
    """Convert a request payload into JSON-serializable data.

    Pydantic models (OpenAI/Gemini SDK types) are dumped in python mode so
    that raw bytes (e.g. Gemini inline image data) reach the bytes branch and
    get standard base64 — pydantic's JSON mode uses the URL-safe alphabet,
    which breaks ``data:`` URLs in the report viewer.
    """
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, bytes):
        return base64.b64encode(value).decode("utf-8")
    if isinstance(value, Enum):
        return to_serializable(value.value)
    if hasattr(value, "model_dump"):
        return to_serializable(value.model_dump(mode="python", exclude_none=True))
    if isinstance(value, dict):
        return {ensure_str(key): to_serializable(child) for key, child in value.items()}
    if isinstance(value, (list, tuple)):
        return [to_serializable(child) for child in value]
    return ensure_str(value)


@dataclass
class PromptReportLogger:
    """Writes one JSON report per LLM API request (turn).

    ``record_request`` writes the report before the request is sent so a
    report exists even if the request fails; ``record_usage`` rewrites it
    with token usage and cost once the turn completes.
    """

    provider: str
    model: Llm
    api_model_name: str
    enabled: bool = field(default_factory=lambda: PROMPT_REPORTS_ENABLED)
    session_id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    _turn_index: int = 0
    _current_report: dict[str, Any] | None = None
    _current_filepath: str | None = None

    def record_request(self, request_payload: Any) -> str | None:
        if not self.enabled:
            return None

        self._turn_index += 1
        now = datetime.now()
        report: dict[str, Any] = {
            "version": 1,
            "provider": self.provider,
            "model": self.model.value,
            "api_model_name": self.api_model_name,
            "session_id": self.session_id,
            "turn": self._turn_index,
            "created_at": now.isoformat(timespec="seconds"),
            "request": to_serializable(request_payload),
            "usage": None,
        }

        filename = (
            f"{PROMPT_REPORT_FILENAME_PREFIX}{now.strftime('%Y%m%d_%H%M%S')}"
            f"_{self.session_id}_t{self._turn_index:02d}"
            f"_{self.provider}_{_sanitize_model_name(self.api_model_name)}.json"
        )

        self._current_report = report
        self._current_filepath = os.path.join(
            get_prompt_reports_directory(), filename
        )
        if self._write_current_report():
            print(f"[PROMPT REPORT] Wrote {self._current_filepath}")
            return self._current_filepath
        return None

    def record_usage(self, usage: TokenUsage) -> None:
        if not self.enabled or self._current_report is None:
            return

        pricing = MODEL_PRICING.get(self.api_model_name)
        self._current_report["usage"] = {
            "input_tokens": usage.input,
            "output_tokens": usage.output,
            "cache_read": usage.cache_read,
            "cache_write": usage.cache_write,
            "total_tokens": usage.total,
            "cache_hit_rate_percent": usage.cache_hit_rate_percent(),
            "cost_usd": usage.cost(pricing) if pricing else None,
        }
        self._write_current_report()

    def _write_current_report(self) -> bool:
        if self._current_report is None or self._current_filepath is None:
            return False
        try:
            os.makedirs(get_prompt_reports_directory(), exist_ok=True)
            with open(self._current_filepath, "w", encoding="utf-8") as f:
                json.dump(self._current_report, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"[PROMPT REPORT] Failed to write report: {e}")
            return False
