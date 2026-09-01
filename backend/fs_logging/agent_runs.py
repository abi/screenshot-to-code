"""Full on-disk capture of agent runs.

When ``PROMPT_REPORTS_ENABLED`` is on, every agent run (one variant of a UI
generation, or one eval task) records everything it does:

- every LLM call: full request payload, assembled response, token usage, cost
- every tool call: full arguments, full result, duration
- every streamed delta (thinking/assistant/tool-args) with timestamps
- the final HTML plus a snapshot of the assets it references

Layout under ``{LOGS_PATH}/run_logs/agent_runs``:

    {run_id}/events.jsonl            appended live, one event per line
    {run_id}/run.json                summary written at finalize
    {run_id}/final.html              final output, verbatim
    {run_id}/final_selfcontained.html  asset refs rewritten to assets/...
    {run_id}/assets/                 copied local assets + downloaded remote images
    {run_id}/assets_manifest.json    original URL -> capture status
    index.db                         SQLite index (runs + llm_calls)

Recording must never break generation: every public method no-ops when
disabled and swallows its own exceptions.
"""

import asyncio
import base64
import hashlib
import json
import os
import re
import shutil
import sqlite3
import time
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any, List, Optional, cast
from urllib.parse import unquote, urlparse

from openai.types.chat import ChatCompletionMessageParam

from config import LOCAL_ASSET_DIR, PROMPT_REPORTS_ENABLED
from llm import MODEL_PROVIDER, Llm
from costs.pricing import MODEL_PRICING
from costs.token_usage import TokenUsage
from fs_logging.prompt_reports import get_run_logs_directory, to_serializable

if TYPE_CHECKING:
    from agent.providers.base import StreamEvent
    from agent.tools.types import ToolCall, ToolExecutionResult

AGENT_RUNS_DIRNAME = "agent_runs"
RUN_ID_PATTERN = re.compile(r"^run_\d{8}_\d{6}_[0-9a-f]{8}$")

# Refs to assets the backend serves itself, with or without a host prefix.
_LOCAL_ASSET_URL_RE = re.compile(
    r"(?:https?://[^\s\"'()<>]+)?/local-assets/[^\s\"'()<>?#]+"
)
# Remote URLs in image-bearing positions: src/srcset/href attributes and CSS
# url(...). Generated images (e.g. replicate.delivery) expire, so they must be
# snapshotted; stable script/stylesheet CDNs are filtered out by extension.
_REMOTE_URL_RE = re.compile(
    r"""(?:src|srcset|href)\s*=\s*["'](https?://[^\s"'<>]+)["']|url\(\s*["']?(https?://[^\s"')]+)["']?\s*\)"""
)
_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif", ".ico"}
_ALWAYS_SNAPSHOT_HOSTS = ("replicate.delivery",)

_ASSET_DOWNLOAD_TIMEOUT_SECONDS = 15.0

# Replicate delivery URLs expire within ~an hour; when run logging is on,
# tool outputs on these hosts are downloaded into the run folder as they are
# produced — even ones the model later discards from the final HTML.
_EXPIRING_ASSET_URL_RE = re.compile(
    r"https?://[^\s\"'\\]*replicate\.delivery/[^\s\"'\\]+"
)


def get_agent_runs_directory() -> str:
    return os.path.join(get_run_logs_directory(), AGENT_RUNS_DIRNAME)


def get_agent_runs_db_path() -> str:
    return os.path.join(get_agent_runs_directory(), "index.db")


_SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (
  run_id            TEXT PRIMARY KEY,
  generation_id     TEXT NOT NULL,
  variant_index     INTEGER NOT NULL,
  entry_point       TEXT NOT NULL,
  provider          TEXT,
  model             TEXT,
  api_model_name    TEXT,
  stack             TEXT,
  input_mode        TEXT,
  generation_type   TEXT,
  status            TEXT NOT NULL DEFAULT 'running',
  error             TEXT,
  created_at        TEXT NOT NULL,
  completed_at      TEXT,
  total_duration_ms INTEGER,
  llm_time_ms       INTEGER,
  tool_time_ms      INTEGER,
  num_llm_calls     INTEGER NOT NULL DEFAULT 0,
  num_tool_calls    INTEGER NOT NULL DEFAULT 0,
  input_tokens      INTEGER,
  output_tokens     INTEGER,
  cache_read_tokens INTEGER,
  cache_write_tokens INTEGER,
  total_tokens      INTEGER,
  total_cost_usd    REAL,
  has_unpriced_calls INTEGER NOT NULL DEFAULT 0,
  run_dir           TEXT NOT NULL,
  size_bytes        INTEGER,
  eval_session      TEXT,
  eval_set          TEXT,
  input_file        TEXT,
  input_image_sha256 TEXT
);
CREATE INDEX IF NOT EXISTS idx_runs_generation ON runs(generation_id);
CREATE INDEX IF NOT EXISTS idx_runs_created ON runs(created_at);
CREATE TABLE IF NOT EXISTS eval_sessions (
  session_id TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  eval_set   TEXT NOT NULL,
  created_at TEXT NOT NULL,
  is_active  INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_eval_sessions_active
  ON eval_sessions(is_active) WHERE is_active = 1;
CREATE TABLE IF NOT EXISTS eval_session_models (
  session_id TEXT NOT NULL,
  model      TEXT NOT NULL,
  position   INTEGER,
  notes      TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (session_id, model)
);
CREATE TABLE IF NOT EXISTS llm_calls (
  run_id       TEXT NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
  step         INTEGER NOT NULL,
  started_at   TEXT,
  duration_ms  INTEGER,
  thinking_ms  INTEGER,
  time_to_first_delta_ms INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cache_read_tokens INTEGER,
  cache_write_tokens INTEGER,
  total_tokens INTEGER,
  cost_usd     REAL,
  num_tool_calls INTEGER,
  PRIMARY KEY (run_id, step)
);
"""


def _migrate_runs_table(conn: sqlite3.Connection) -> None:
    """Add columns introduced after the first release.

    ``CREATE TABLE IF NOT EXISTS`` never alters an existing table, so a
    populated index.db from before these columns needs explicit ALTERs. The
    matching indexes must live here too — creating them in ``_SCHEMA`` would
    fail against an un-migrated table.
    """
    existing = {row[1] for row in conn.execute("PRAGMA table_info(runs)")}
    for column in ("eval_session", "eval_set", "input_file", "input_image_sha256"):
        if column not in existing:
            conn.execute(f"ALTER TABLE runs ADD COLUMN {column} TEXT")
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_runs_eval_session ON runs(eval_session)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_runs_input_sha ON runs(input_image_sha256)"
    )
    conn.commit()


def open_index_db() -> sqlite3.Connection:
    os.makedirs(get_agent_runs_directory(), exist_ok=True)
    conn = sqlite3.connect(get_agent_runs_db_path(), timeout=5)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.executescript(_SCHEMA)
    _migrate_runs_table(conn)
    return conn


def _now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _first_input_image_sha256(prompt_messages: Any) -> Optional[str]:
    """Digest of the first input image's raw bytes, or None.

    Mirrors ``AgentEngine._extract_input_images`` — duplicated because this
    module must not import ``agent.engine`` (the engine imports us). Since
    eval inputs are base64-encoded file bytes verbatim, this digest equals
    the sha256 of the PNG on disk, which is the matrix-matching invariant.
    """
    try:
        messages = cast(List[ChatCompletionMessageParam], prompt_messages or [])
        for message in messages:
            if not isinstance(message, dict):
                continue
            content = message.get("content")
            if not isinstance(content, list):
                continue
            for part in content:
                if not isinstance(part, dict) or part.get("type") != "image_url":
                    continue
                image_url = part.get("image_url")
                if not isinstance(image_url, dict):
                    continue
                url = cast(object, image_url.get("url"))
                if (
                    isinstance(url, str)
                    and url.startswith("data:image/")
                    and "," in url
                ):
                    payload = base64.b64decode(url.split(",", 1)[1])
                    return hashlib.sha256(payload).hexdigest()
    except Exception:
        return None
    return None


def _guess_extension(url: str, content_type: Optional[str]) -> str:
    path_ext = os.path.splitext(urlparse(url).path)[1].lower()
    if path_ext in _IMAGE_EXTENSIONS:
        return path_ext
    if content_type:
        subtype = content_type.split("/")[-1].split(";")[0].strip().lower()
        mapped = {"jpeg": ".jpg", "svg+xml": ".svg"}.get(subtype, f".{subtype}")
        if mapped in _IMAGE_EXTENSIONS:
            return mapped
    return ".bin"


class AgentRunRecorder:
    """Records one agent run (one variant). One instance per ``Agent.run()``."""

    def __init__(
        self,
        *,
        generation_id: str,
        variant_index: int,
        entry_point: str,
        stack: Optional[str] = None,
        input_mode: Optional[str] = None,
        generation_type: Optional[str] = None,
        enabled: Optional[bool] = None,
        eval_session: Optional[str] = None,
        eval_set: Optional[str] = None,
        input_file: Optional[str] = None,
    ) -> None:
        self.enabled = PROMPT_REPORTS_ENABLED if enabled is None else enabled
        self.generation_id = generation_id
        self.variant_index = variant_index
        self.entry_point = entry_point
        self.stack = stack
        self.input_mode = input_mode
        self.generation_type = generation_type
        self.eval_session = eval_session
        self.eval_set = eval_set
        self.input_file = input_file
        self._input_image_sha256: Optional[str] = None
        self.run_id = (
            f"run_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        )

        self._seq = 0
        self._ended = False
        self._model: Optional[str] = None
        self._provider: Optional[str] = None
        self._api_model_name: Optional[str] = None

        self._run_started_mono: Optional[float] = None
        self._step = 0
        self._step_started_mono: Optional[float] = None
        self._step_started_at: Optional[str] = None
        self._first_delta_mono: Optional[float] = None
        self._first_thinking_mono: Optional[float] = None
        self._last_thinking_mono: Optional[float] = None
        self._thinking_buffer: list[str] = []
        self._assistant_buffer: list[str] = []
        self._tool_args_progress: dict[str, int] = {}
        self._tool_started_mono: dict[str, float] = {}

        self._total_usage = TokenUsage()
        self._priced_cost_usd = 0.0
        self._num_priced_calls = 0
        self._has_unpriced_calls = False
        self._llm_time_ms = 0
        self._tool_time_ms = 0
        self._num_tool_calls = 0
        self._llm_call_summaries: list[dict[str, Any]] = []
        self._tool_call_summaries: list[dict[str, Any]] = []
        self._tool_asset_urls: set[str] = set()
        self._tool_asset_tasks: list["asyncio.Task[None]"] = []
        self._tool_asset_manifest: list[dict[str, Any]] = []
        self._step_cost_log: list[dict[str, Any]] = []

    # ------------------------------------------------------------------ paths

    @property
    def run_dir(self) -> str:
        return os.path.join(get_agent_runs_directory(), self.run_id)

    def _events_path(self) -> str:
        return os.path.join(self.run_dir, "events.jsonl")

    # ------------------------------------------------------------- primitives

    def _append_event(self, event_type: str, payload: dict[str, Any]) -> None:
        self._seq += 1
        event: dict[str, Any] = {
            "seq": self._seq,
            "ts_ms": int(time.time() * 1000),
            "type": event_type,
        }
        event.update(payload)
        os.makedirs(self.run_dir, exist_ok=True)
        with open(self._events_path(), "a", encoding="utf-8") as f:
            f.write(json.dumps(to_serializable(event), ensure_ascii=False) + "\n")

    def _db_write(self, sql: str, params: tuple[Any, ...]) -> None:
        conn = open_index_db()
        try:
            conn.execute(sql, params)
            conn.commit()
        finally:
            conn.close()

    @staticmethod
    def _elapsed_ms(since: Optional[float]) -> Optional[int]:
        if since is None:
            return None
        return int((time.perf_counter() - since) * 1000)

    # -------------------------------------------------------------- lifecycle

    def record_run_start(self, model: Llm, prompt_messages: Any) -> None:
        if not self.enabled:
            return
        try:
            self._run_started_mono = time.perf_counter()
            self._model = model.value
            self._provider = MODEL_PROVIDER.get(model)
            self._input_image_sha256 = _first_input_image_sha256(prompt_messages)
            self._append_event(
                "run_start",
                {
                    "run_id": self.run_id,
                    "generation_id": self.generation_id,
                    "variant_index": self.variant_index,
                    "entry_point": self.entry_point,
                    "model": self._model,
                    "provider": self._provider,
                    "stack": self.stack,
                    "input_mode": self.input_mode,
                    "generation_type": self.generation_type,
                    "eval_session": self.eval_session,
                    "eval_set": self.eval_set,
                    "input_file": self.input_file,
                    "input_image_sha256": self._input_image_sha256,
                    "prompt_messages": prompt_messages,
                },
            )
            self._db_write(
                """INSERT OR REPLACE INTO runs
                   (run_id, generation_id, variant_index, entry_point, provider,
                    model, stack, input_mode, generation_type, status,
                    created_at, run_dir, eval_session, eval_set, input_file,
                    input_image_sha256)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'running', ?, ?, ?, ?, ?, ?)""",
                (
                    self.run_id,
                    self.generation_id,
                    self.variant_index,
                    self.entry_point,
                    self._provider,
                    self._model,
                    self.stack,
                    self.input_mode,
                    self.generation_type,
                    _now_iso(),
                    self.run_dir,
                    self.eval_session,
                    self.eval_set,
                    self.input_file,
                    self._input_image_sha256,
                ),
            )
        except Exception as exc:
            print(f"[AGENT RUN] Failed to record run start: {exc}")

    # -------------------------------------------------------------- LLM hooks

    def record_llm_request(
        self, provider: str, api_model_name: str, payload: Any
    ) -> None:
        if not self.enabled:
            return
        try:
            self._step += 1
            self._step_started_mono = time.perf_counter()
            self._step_started_at = _now_iso()
            self._first_delta_mono = None
            self._first_thinking_mono = None
            self._last_thinking_mono = None
            self._thinking_buffer = []
            self._assistant_buffer = []
            self._api_model_name = api_model_name
            self._append_event(
                "llm_call_start",
                {
                    "step": self._step,
                    "provider": provider,
                    "api_model_name": api_model_name,
                    "request": payload,
                },
            )
        except Exception as exc:
            print(f"[AGENT RUN] Failed to record LLM request: {exc}")

    def record_stream_event(
        self, event: "StreamEvent", event_id: Optional[str]
    ) -> None:
        if not self.enabled:
            return
        try:
            now = time.perf_counter()
            if self._first_delta_mono is None:
                self._first_delta_mono = now
            payload: dict[str, Any] = {"step": self._step, "event_id": event_id}
            if event.type == "thinking_delta":
                if self._first_thinking_mono is None:
                    self._first_thinking_mono = now
                self._last_thinking_mono = now
                self._thinking_buffer.append(event.text)
                payload.update({"kind": "thinking", "text": event.text})
            elif event.type == "assistant_delta":
                self._assistant_buffer.append(event.text)
                payload.update({"kind": "assistant", "text": event.text})
            else:  # tool_call_delta
                args = event.tool_arguments
                args_text = args if isinstance(args, str) else json.dumps(
                    to_serializable(args), ensure_ascii=False
                )
                # OpenAI streams *cumulative* argument snapshots; record only
                # the unseen suffix so the JSONL replays without O(n^2) bloat.
                key = event.tool_call_id or "unknown"
                seen = self._tool_args_progress.get(key, 0)
                delta = args_text[seen:] if len(args_text) > seen else ""
                self._tool_args_progress[key] = max(seen, len(args_text))
                payload.update(
                    {
                        "kind": "tool_call",
                        "tool_call_id": event.tool_call_id,
                        "tool_name": event.tool_name,
                        "args_len": len(args_text),
                        "args_delta": delta,
                    }
                )
            self._append_event("stream_delta", payload)
        except Exception as exc:
            print(f"[AGENT RUN] Failed to record stream event: {exc}")

    def record_llm_response(
        self,
        assistant_text: str,
        tool_calls: "list[ToolCall]",
        usage: Optional[TokenUsage],
    ) -> None:
        if not self.enabled:
            return
        try:
            duration_ms = self._elapsed_ms(self._step_started_mono)
            time_to_first_delta_ms = (
                int((self._first_delta_mono - self._step_started_mono) * 1000)
                if self._first_delta_mono is not None
                and self._step_started_mono is not None
                else None
            )
            thinking_ms = (
                int((self._last_thinking_mono - self._first_thinking_mono) * 1000)
                if self._first_thinking_mono is not None
                and self._last_thinking_mono is not None
                else 0
            )
            cost_usd: Optional[float] = None
            usage_dict: Optional[dict[str, int]] = None
            if usage is not None:
                usage_dict = {
                    "input": usage.input,
                    "output": usage.output,
                    "cache_read": usage.cache_read,
                    "cache_write": usage.cache_write,
                    "total": usage.total,
                }
                self._total_usage.accumulate(usage)
                pricing = (
                    MODEL_PRICING.get(self._api_model_name)
                    if self._api_model_name
                    else None
                )
                if pricing is not None:
                    cost_usd = usage.cost(pricing)
                    self._priced_cost_usd += cost_usd
                    self._num_priced_calls += 1
                else:
                    self._has_unpriced_calls = True
            else:
                self._has_unpriced_calls = True
            if duration_ms is not None:
                self._llm_time_ms += duration_ms

            call_summary: dict[str, Any] = {
                "step": self._step,
                "started_at": self._step_started_at,
                "duration_ms": duration_ms,
                "thinking_ms": thinking_ms,
                "time_to_first_delta_ms": time_to_first_delta_ms,
                "usage": usage_dict,
                "cost_usd": cost_usd,
                "num_tool_calls": len(tool_calls),
            }
            self._llm_call_summaries.append(call_summary)
            self._append_event(
                "llm_call_end",
                {
                    **call_summary,
                    "assistant_text": assistant_text,
                    "thinking_text": "".join(self._thinking_buffer),
                    "tool_calls": [
                        {"id": c.id, "name": c.name, "arguments": c.arguments}
                        for c in tool_calls
                    ],
                },
            )
            self._db_write(
                """INSERT OR REPLACE INTO llm_calls
                   (run_id, step, started_at, duration_ms, thinking_ms,
                    time_to_first_delta_ms, input_tokens, output_tokens,
                    cache_read_tokens, cache_write_tokens, total_tokens,
                    cost_usd, num_tool_calls)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    self.run_id,
                    self._step,
                    self._step_started_at,
                    duration_ms,
                    thinking_ms,
                    time_to_first_delta_ms,
                    usage.input if usage else None,
                    usage.output if usage else None,
                    usage.cache_read if usage else None,
                    usage.cache_write if usage else None,
                    usage.total if usage else None,
                    cost_usd,
                    len(tool_calls),
                ),
            )
        except Exception as exc:
            print(f"[AGENT RUN] Failed to record LLM response: {exc}")

    # ------------------------------------------------------------- tool hooks

    def record_tool_start(self, tool_event_id: str, tool_call: "ToolCall") -> None:
        if not self.enabled:
            return
        try:
            self._tool_started_mono[tool_event_id] = time.perf_counter()
            self._append_event(
                "tool_call_start",
                {
                    "step": self._step,
                    "tool_event_id": tool_event_id,
                    "tool_call_id": tool_call.id,
                    "name": tool_call.name,
                    "arguments": tool_call.arguments,
                },
            )
        except Exception as exc:
            print(f"[AGENT RUN] Failed to record tool start: {exc}")

    def record_tool_end(
        self,
        tool_event_id: str,
        tool_call: "ToolCall",
        result: "ToolExecutionResult",
    ) -> None:
        if not self.enabled:
            return
        try:
            duration_ms = self._elapsed_ms(
                self._tool_started_mono.pop(tool_event_id, None)
            )
            if duration_ms is not None:
                self._tool_time_ms += duration_ms
            self._num_tool_calls += 1
            multimodal_meta: list[dict[str, Any]] = [
                {
                    "display_name": part.display_name,
                    "mime_type": part.mime_type,
                    # Bytes reappear base64'd in the next llm_call_start
                    # request payload, so store metadata only here.
                    "data_len": len(part.data) if part.data is not None else None,
                    "image_url": part.image_url,
                }
                for part in (result.multimodal_parts or [])
            ]
            self._tool_call_summaries.append(
                {
                    "step": self._step,
                    "name": tool_call.name,
                    "ok": result.ok,
                    "duration_ms": duration_ms,
                    "summary": result.summary,
                }
            )
            self._append_event(
                "tool_call_end",
                {
                    "step": self._step,
                    "tool_event_id": tool_event_id,
                    "name": tool_call.name,
                    "ok": result.ok,
                    "duration_ms": duration_ms,
                    "result": result.result,
                    "summary": result.summary,
                    "updated_content_len": (
                        len(result.updated_content)
                        if result.updated_content is not None
                        else None
                    ),
                    "multimodal_parts": multimodal_meta,
                },
            )
            self._schedule_tool_asset_downloads(tool_event_id, result)
        except Exception as exc:
            print(f"[AGENT RUN] Failed to record tool end: {exc}")

    def _schedule_tool_asset_downloads(
        self, tool_event_id: str, result: "ToolExecutionResult"
    ) -> None:
        """Kick off background downloads of expiring tool-output URLs.

        Fire-and-forget so generation latency is unaffected; the tasks are
        gathered in ``record_run_end`` before the manifest is written. Only
        runs when recording is enabled, so without prompt logging nothing is
        ever fetched or stored.
        """
        try:
            blob = json.dumps(to_serializable(result.result), ensure_ascii=False)
            urls = [
                url
                for url in dict.fromkeys(_EXPIRING_ASSET_URL_RE.findall(blob))
                if url not in self._tool_asset_urls
            ]
            if not urls:
                return
            loop = asyncio.get_running_loop()
            for index, url in enumerate(urls):
                self._tool_asset_urls.add(url)
                entry: dict[str, Any] = {
                    "url": url,
                    "tool_event_id": tool_event_id,
                    "status": "pending",
                }
                self._tool_asset_manifest.append(entry)
                self._tool_asset_tasks.append(
                    loop.create_task(
                        self._download_tool_asset(url, tool_event_id, index, entry)
                    )
                )
        except RuntimeError:
            # No running event loop (sync callers/tests): skip quietly.
            return
        except Exception as exc:
            print(f"[AGENT RUN] Failed to schedule tool asset downloads: {exc}")

    async def _download_tool_asset(
        self, url: str, tool_event_id: str, index: int, entry: dict[str, Any]
    ) -> None:
        try:
            import httpx

            tool_assets_dir = os.path.join(self.run_dir, "tool_assets")
            os.makedirs(tool_assets_dir, exist_ok=True)
            async with httpx.AsyncClient(
                timeout=_ASSET_DOWNLOAD_TIMEOUT_SECONDS, follow_redirects=True
            ) as client:
                response = await client.get(url)
                response.raise_for_status()
                content = response.content
            safe_event = re.sub(r"[^A-Za-z0-9_-]", "_", tool_event_id)[:60]
            ext = _guess_extension(url, response.headers.get("content-type"))
            filename = f"{safe_event}_{index}{ext}"
            with open(os.path.join(tool_assets_dir, filename), "wb") as f:
                f.write(content)
            entry.update(
                {
                    "file": f"tool_assets/{filename}",
                    "bytes": len(content),
                    "sha256": hashlib.sha256(content).hexdigest()[:12],
                    "status": "saved",
                }
            )
        except Exception as exc:
            entry.update({"status": "failed", "error": str(exc)})

    def record_set_code(self, content_len: int, source: str) -> None:
        if not self.enabled:
            return
        try:
            self._append_event(
                "set_code", {"step": self._step, "source": source, "content_len": content_len}
            )
        except Exception as exc:
            print(f"[AGENT RUN] Failed to record set_code: {exc}")

    def record_step_cost(
        self, step: int, step_cost_usd: float, cumulative_cost_usd: float
    ) -> None:
        """Record the cost incurred by a single tool-call step.

        Called from ``AgentEngine._run_with_session`` after ``append_tool_results``
        so the full cost (LLM turn + all tool executions) is included.
        Written to JSONL live and aggregated into run.json at finalisation.
        """
        if not self.enabled:
            return
        try:
            entry = {
                "step": step,
                "step_cost_usd": step_cost_usd,
                "cumulative_cost_usd": cumulative_cost_usd,
            }
            self._step_cost_log.append(entry)
            self._append_event("step_cost", entry)
        except Exception as exc:
            print(f"[AGENT RUN] Failed to record step cost: {exc}")

    # --------------------------------------------------------------- finalize

    async def record_run_end(
        self,
        status: str,
        error: Optional[str] = None,
        final_html: Optional[str] = None,
    ) -> None:
        if not self.enabled or self._ended:
            return
        self._ended = True
        try:
            total_duration_ms = self._elapsed_ms(self._run_started_mono)
            total_cost_usd = (
                self._priced_cost_usd if self._num_priced_calls > 0 else None
            )
            if self._tool_asset_tasks:
                await asyncio.gather(
                    *self._tool_asset_tasks, return_exceptions=True
                )
            if final_html:
                await self._snapshot_output(final_html)
            self._append_event(
                "run_end",
                {
                    "status": status,
                    "error": error,
                    "total_duration_ms": total_duration_ms,
                    "llm_time_ms": self._llm_time_ms,
                    "tool_time_ms": self._tool_time_ms,
                    "num_llm_calls": self._step,
                    "num_tool_calls": self._num_tool_calls,
                    "usage": {
                        "input": self._total_usage.input,
                        "output": self._total_usage.output,
                        "cache_read": self._total_usage.cache_read,
                        "cache_write": self._total_usage.cache_write,
                        "total": self._total_usage.total,
                    },
                    "total_cost_usd": total_cost_usd,
                    "has_unpriced_calls": self._has_unpriced_calls,
                    "final_html_len": len(final_html) if final_html else None,
                },
            )
            run_summary: dict[str, Any] = {
                "run_id": self.run_id,
                "generation_id": self.generation_id,
                "variant_index": self.variant_index,
                "entry_point": self.entry_point,
                "provider": self._provider,
                "model": self._model,
                "api_model_name": self._api_model_name,
                "stack": self.stack,
                "input_mode": self.input_mode,
                "generation_type": self.generation_type,
                "eval_session": self.eval_session,
                "eval_set": self.eval_set,
                "input_file": self.input_file,
                "input_image_sha256": self._input_image_sha256,
                "status": status,
                "error": error,
                "completed_at": _now_iso(),
                "total_duration_ms": total_duration_ms,
                "llm_time_ms": self._llm_time_ms,
                "tool_time_ms": self._tool_time_ms,
                "total_cost_usd": total_cost_usd,
                "has_unpriced_calls": self._has_unpriced_calls,
                "llm_calls": self._llm_call_summaries,
                "tool_calls": self._tool_call_summaries,
                "step_costs": self._step_cost_log,
                "tool_assets": self._tool_asset_manifest,
                "final_html": final_html,
            }
            os.makedirs(self.run_dir, exist_ok=True)
            with open(
                os.path.join(self.run_dir, "run.json"), "w", encoding="utf-8"
            ) as f:
                json.dump(to_serializable(run_summary), f, indent=2, ensure_ascii=False)

            size_bytes = 0
            for root, _, files in os.walk(self.run_dir):
                for name in files:
                    size_bytes += os.path.getsize(os.path.join(root, name))

            self._db_write(
                """UPDATE runs SET
                     status = ?, error = ?, completed_at = ?, api_model_name = ?,
                     total_duration_ms = ?, llm_time_ms = ?, tool_time_ms = ?,
                     num_llm_calls = ?, num_tool_calls = ?,
                     input_tokens = ?, output_tokens = ?, cache_read_tokens = ?,
                     cache_write_tokens = ?, total_tokens = ?,
                     total_cost_usd = ?, has_unpriced_calls = ?, size_bytes = ?
                   WHERE run_id = ?""",
                (
                    status,
                    error,
                    _now_iso(),
                    self._api_model_name,
                    total_duration_ms,
                    self._llm_time_ms,
                    self._tool_time_ms,
                    self._step,
                    self._num_tool_calls,
                    self._total_usage.input,
                    self._total_usage.output,
                    self._total_usage.cache_read,
                    self._total_usage.cache_write,
                    self._total_usage.total,
                    total_cost_usd,
                    1 if self._has_unpriced_calls else 0,
                    size_bytes,
                    self.run_id,
                ),
            )
        except Exception as exc:
            print(f"[AGENT RUN] Failed to record run end: {exc}")

    # --------------------------------------------------------- output capture

    async def _snapshot_output(self, final_html: str) -> None:
        """Save final.html plus every asset it references.

        Local ``/local-assets/`` files are copied from ``LOCAL_ASSET_DIR``;
        remote image URLs are downloaded (generated-image hosts expire their
        URLs). ``final_selfcontained.html`` gets all captured refs rewritten
        to relative ``assets/`` paths so the run folder stands alone.
        """
        assets_dir = os.path.join(self.run_dir, "assets")
        os.makedirs(assets_dir, exist_ok=True)
        with open(
            os.path.join(self.run_dir, "final.html"), "w", encoding="utf-8"
        ) as f:
            f.write(final_html)

        manifest: list[dict[str, Any]] = []
        replacements: dict[str, str] = {}
        used_names: set[str] = set()

        def unique_name(candidate: str) -> str:
            base, ext = os.path.splitext(os.path.basename(candidate) or "asset")
            name = f"{base}{ext}"
            counter = 1
            while name in used_names:
                name = f"{base}_{counter}{ext}"
                counter += 1
            used_names.add(name)
            return name

        # The same file can be referenced under several URL forms (with and
        # without a host prefix); copy it once and point every form at it.
        copied_local: dict[str, str] = {}
        for url in dict.fromkeys(_LOCAL_ASSET_URL_RE.findall(final_html)):
            filename = unquote(url.split("/local-assets/", 1)[1])
            source_path = os.path.join(LOCAL_ASSET_DIR, filename)
            entry: dict[str, Any] = {"url": url, "kind": "local"}
            if filename in copied_local:
                saved_name = copied_local[filename]
                entry.update(
                    {
                        "file": f"assets/{saved_name}",
                        "bytes": os.path.getsize(source_path),
                        "status": "copied",
                    }
                )
                replacements[url] = f"assets/{saved_name}"
            elif os.path.isfile(source_path):
                saved_name = unique_name(filename)
                shutil.copy2(source_path, os.path.join(assets_dir, saved_name))
                copied_local[filename] = saved_name
                entry.update(
                    {
                        "file": f"assets/{saved_name}",
                        "bytes": os.path.getsize(source_path),
                        "status": "copied",
                    }
                )
                replacements[url] = f"assets/{saved_name}"
            else:
                entry["status"] = "missing"
            manifest.append(entry)

        remote_urls: list[str] = []
        for match in _REMOTE_URL_RE.finditer(final_html):
            url = match.group(1) or match.group(2)
            if not url or "/local-assets/" in url or url in remote_urls:
                continue
            path_ext = os.path.splitext(urlparse(url).path)[1].lower()
            host = urlparse(url).netloc
            if path_ext in _IMAGE_EXTENSIONS or any(
                host.endswith(h) for h in _ALWAYS_SNAPSHOT_HOSTS
            ):
                remote_urls.append(url)
        # Expiring-host URLs can also appear outside markup attributes —
        # e.g. as JS string literals (`image.src = '...'`) — so sweep the
        # whole document for them regardless of context.
        for url in _EXPIRING_ASSET_URL_RE.findall(final_html):
            if url not in remote_urls:
                remote_urls.append(url)

        if remote_urls:
            import httpx

            async with httpx.AsyncClient(
                timeout=_ASSET_DOWNLOAD_TIMEOUT_SECONDS, follow_redirects=True
            ) as client:
                for url in remote_urls:
                    entry = {"url": url, "kind": "remote"}
                    try:
                        response = await client.get(url)
                        response.raise_for_status()
                        content = response.content
                        digest = hashlib.sha256(content).hexdigest()[:12]
                        ext = _guess_extension(
                            url, response.headers.get("content-type")
                        )
                        saved_name = unique_name(f"remote_{digest}{ext}")
                        with open(os.path.join(assets_dir, saved_name), "wb") as f:
                            f.write(content)
                        entry.update(
                            {
                                "file": f"assets/{saved_name}",
                                "bytes": len(content),
                                "sha256": digest,
                                "status": "downloaded",
                            }
                        )
                        replacements[url] = f"assets/{saved_name}"
                    except Exception as exc:
                        entry.update({"status": "failed", "error": str(exc)})
                    manifest.append(entry)

        self_contained = final_html
        # Longest-first so a bare "/local-assets/x" ref never clobbers the
        # middle of a full "http://host/local-assets/x" ref.
        for url in sorted(replacements, key=len, reverse=True):
            self_contained = self_contained.replace(url, replacements[url])
        with open(
            os.path.join(self.run_dir, "final_selfcontained.html"),
            "w",
            encoding="utf-8",
        ) as f:
            f.write(self_contained)
        with open(
            os.path.join(self.run_dir, "assets_manifest.json"), "w", encoding="utf-8"
        ) as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
