import base64
import json
import os
from datetime import datetime, timedelta
from pathlib import Path

import pytest
from fastapi import HTTPException

from agent.providers.token_usage import TokenUsage
from fs_logging.prompt_reports import (
    PROMPT_REPORT_FILENAME_PATTERN,
    PromptReportLogger,
    to_serializable,
)
from llm import Llm
from routes.prompt_reports import (
    PrunePromptReportsRequest,
    get_prompt_report_content,
    list_prompt_reports,
    prune_prompt_reports,
)


@pytest.fixture
def logs_path(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setenv("LOGS_PATH", str(tmp_path))
    return tmp_path


def _make_logger(enabled: bool = True) -> PromptReportLogger:
    return PromptReportLogger(
        provider="openai",
        model=Llm.GPT_5_5_HIGH,
        api_model_name="gpt-5.5",
        enabled=enabled,
    )


def test_record_request_writes_json_report(logs_path: Path) -> None:
    logger = _make_logger()
    filepath = logger.record_request({"model": "gpt-5.5", "input": ["hello"]})

    assert filepath is not None
    filename = os.path.basename(filepath)
    assert PROMPT_REPORT_FILENAME_PATTERN.match(filename) is not None
    assert Path(filepath).parent == logs_path / "run_logs" / "prompt_reports"

    with open(filepath) as f:
        report = json.load(f)
    assert report["provider"] == "openai"
    assert report["model"] == Llm.GPT_5_5_HIGH.value
    assert report["api_model_name"] == "gpt-5.5"
    assert report["turn"] == 1
    assert report["request"] == {"model": "gpt-5.5", "input": ["hello"]}
    assert report["usage"] is None


def test_record_usage_updates_report_with_cost(logs_path: Path) -> None:
    logger = _make_logger()
    filepath = logger.record_request({"input": []})
    assert filepath is not None

    logger.record_usage(
        TokenUsage(input=1000, output=500, cache_read=200, cache_write=0, total=1700)
    )

    with open(filepath) as f:
        report = json.load(f)
    usage = report["usage"]
    assert usage["input_tokens"] == 1000
    assert usage["output_tokens"] == 500
    assert usage["cache_read"] == 200
    assert usage["total_tokens"] == 1700
    assert usage["cost_usd"] is not None and usage["cost_usd"] > 0


def test_each_turn_writes_a_new_report(logs_path: Path) -> None:
    logger = _make_logger()
    first = logger.record_request({"input": ["turn one"]})
    second = logger.record_request({"input": ["turn two"]})

    assert first is not None and second is not None
    assert first != second
    with open(second) as f:
        assert json.load(f)["turn"] == 2


def test_disabled_logger_writes_nothing(logs_path: Path) -> None:
    logger = _make_logger(enabled=False)
    assert logger.record_request({"input": []}) is None
    logger.record_usage(TokenUsage(input=1, output=1, total=2))
    assert not (logs_path / "run_logs").exists()


def test_to_serializable_uses_standard_base64_for_gemini_inline_bytes() -> None:
    from google.genai import types

    # Bytes that produce '+' and '/' in standard base64 — pydantic's JSON mode
    # would emit the URL-safe alphabet here, which breaks data: URLs.
    raw = bytes(range(256)) * 4
    part = types.Part.from_bytes(data=raw, mime_type="image/png")

    serialized = to_serializable(part)

    data = serialized["inline_data"]["data"]
    assert data == base64.b64encode(raw).decode()
    assert "-" not in data and "_" not in data
    assert serialized["inline_data"]["mime_type"] == "image/png"


def test_to_serializable_handles_bytes_and_pydantic_like_objects() -> None:
    class FakeModel:
        def model_dump(
            self, mode: str = "python", exclude_none: bool = False
        ) -> dict[str, object]:
            assert mode == "python"
            return {"text": "hi", "nested": [1, 2]}

    raw = b"\x89PNG"
    assert to_serializable(raw) == base64.b64encode(raw).decode()
    assert to_serializable({"part": FakeModel()}) == {
        "part": {"text": "hi", "nested": [1, 2]}
    }


@pytest.mark.asyncio
async def test_list_prompt_reports_returns_metadata_and_total_size(
    logs_path: Path,
) -> None:
    logger = _make_logger()
    logger.record_request({"input": ["hello"]})

    # Legacy artifacts in run_logs count toward total size but are not listed.
    legacy_file = logs_path / "run_logs" / "old_report.html"
    legacy_file.write_text("<html>legacy</html>")

    response = await list_prompt_reports()

    assert len(response.reports) == 1
    report = response.reports[0]
    assert report.provider == "openai"
    assert report.model == "gpt-5.5"
    assert report.turn == 1
    assert report.size_bytes > 0
    assert response.total_size_bytes >= report.size_bytes + legacy_file.stat().st_size


@pytest.mark.asyncio
async def test_get_prompt_report_content_round_trips(logs_path: Path) -> None:
    logger = _make_logger()
    filepath = logger.record_request({"input": ["hello"]})
    assert filepath is not None

    content = await get_prompt_report_content(os.path.basename(filepath))
    assert content["request"] == {"input": ["hello"]}


@pytest.mark.asyncio
async def test_get_prompt_report_content_rejects_unsafe_filenames(
    logs_path: Path,
) -> None:
    for filename in ["../secrets.json", "notareport.json", "a/b.json"]:
        with pytest.raises(HTTPException) as error_info:
            await get_prompt_report_content(filename)
        assert error_info.value.status_code == 400


@pytest.mark.asyncio
async def test_prune_deletes_only_old_reports_and_legacy_artifacts(
    logs_path: Path,
) -> None:
    logger = _make_logger()
    fresh_report = logger.record_request({"input": ["fresh"]})
    old_report = logger.record_request({"input": ["old"]})
    assert fresh_report is not None and old_report is not None

    legacy_dir = logs_path / "run_logs" / "legacy_run"
    legacy_dir.mkdir()
    (legacy_dir / "index.html").write_text("<html>old</html>")

    old_timestamp = (datetime.now() - timedelta(days=8)).timestamp()
    os.utime(old_report, (old_timestamp, old_timestamp))
    os.utime(legacy_dir, (old_timestamp, old_timestamp))

    response = await prune_prompt_reports(PrunePromptReportsRequest(max_age_days=7))

    assert response.deleted_count == 2
    assert response.freed_bytes > 0
    assert os.path.exists(fresh_report)
    assert not os.path.exists(old_report)
    assert not legacy_dir.exists()
