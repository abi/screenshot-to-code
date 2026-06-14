"""Endpoints for browsing and pruning on-disk LLM prompt reports.

Reports are JSON files written by ``fs_logging.prompt_reports`` into
``{LOGS_PATH}/run_logs/prompt_reports``. Pruning and the total-size figure
cover the whole ``run_logs`` directory so legacy HTML reports are included.
"""

import json
import os
import re
import shutil
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from fs_logging.prompt_reports import (
    PROMPT_REPORT_FILENAME_PATTERN,
    get_prompt_reports_directory,
    get_run_logs_directory,
)

router = APIRouter()


class PromptReportSummary(BaseModel):
    filename: str
    provider: str
    model: str
    created_at: str
    session_id: str
    turn: int
    size_bytes: int
    cost_usd: float | None = None


class PromptReportListResponse(BaseModel):
    reports: list[PromptReportSummary]
    total_size_bytes: int
    reports_directory: str


class PrunePromptReportsRequest(BaseModel):
    max_age_days: int = 7


class PrunePromptReportsResponse(BaseModel):
    deleted_count: int
    freed_bytes: int


def _directory_size_bytes(directory: str) -> int:
    total = 0
    for root, _dirs, files in os.walk(directory):
        for name in files:
            try:
                total += os.path.getsize(os.path.join(root, name))
            except OSError:
                continue
    return total


_COST_USD_PATTERN = re.compile(
    r'"cost_usd"\s*:\s*(null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)'
)


def _read_report_cost_usd(filepath: str) -> float | None:
    """Read a report's usage cost without parsing the whole (possibly multi-MB,
    image-laden) file.

    ``usage`` is the last key the writer emits, so ``cost_usd`` lives at the
    tail; reading the final chunk and taking the last match keeps listing cheap.
    """
    try:
        size = os.path.getsize(filepath)
        with open(filepath, "rb") as f:
            if size > 2048:
                f.seek(-2048, os.SEEK_END)
            tail = f.read().decode("utf-8", errors="ignore")
    except OSError:
        return None

    matches = _COST_USD_PATTERN.findall(tail)
    if not matches:
        return None
    last = matches[-1]
    if last == "null":
        return None
    try:
        return float(last)
    except ValueError:
        return None


def _summarize_report_file(directory: str, filename: str) -> PromptReportSummary | None:
    match = PROMPT_REPORT_FILENAME_PATTERN.match(filename)
    if match is None:
        return None

    try:
        size_bytes = os.path.getsize(os.path.join(directory, filename))
    except OSError:
        return None

    created_at = (
        datetime.strptime(
            f"{match.group('date')}{match.group('time')}", "%Y%m%d%H%M%S"
        ).isoformat(timespec="seconds")
    )
    return PromptReportSummary(
        filename=filename,
        provider=match.group("provider"),
        model=match.group("model"),
        created_at=created_at,
        session_id=match.group("session"),
        turn=int(match.group("turn")),
        size_bytes=size_bytes,
        cost_usd=_read_report_cost_usd(os.path.join(directory, filename)),
    )


@router.get("/prompt-reports", response_model=PromptReportListResponse)
async def list_prompt_reports() -> PromptReportListResponse:
    reports_directory = get_prompt_reports_directory()
    run_logs_directory = get_run_logs_directory()

    reports: list[PromptReportSummary] = []
    if os.path.isdir(reports_directory):
        for filename in os.listdir(reports_directory):
            summary = _summarize_report_file(reports_directory, filename)
            if summary is not None:
                reports.append(summary)

    reports.sort(key=lambda report: (report.created_at, report.turn), reverse=True)

    total_size_bytes = (
        _directory_size_bytes(run_logs_directory)
        if os.path.isdir(run_logs_directory)
        else 0
    )

    return PromptReportListResponse(
        reports=reports,
        total_size_bytes=total_size_bytes,
        reports_directory=reports_directory,
    )


@router.get("/prompt-reports/content")
async def get_prompt_report_content(filename: str) -> Any:
    if PROMPT_REPORT_FILENAME_PATTERN.match(filename) is None:
        raise HTTPException(status_code=400, detail="Invalid report filename")

    filepath = os.path.join(get_prompt_reports_directory(), filename)
    if not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="Report not found")

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        raise HTTPException(status_code=500, detail=f"Failed to read report: {e}")


@router.post("/prompt-reports/prune", response_model=PrunePromptReportsResponse)
async def prune_prompt_reports(
    request: PrunePromptReportsRequest,
) -> PrunePromptReportsResponse:
    if request.max_age_days < 1:
        raise HTTPException(status_code=400, detail="max_age_days must be >= 1")

    run_logs_directory = get_run_logs_directory()
    if not os.path.isdir(run_logs_directory):
        return PrunePromptReportsResponse(deleted_count=0, freed_bytes=0)

    cutoff = datetime.now() - timedelta(days=request.max_age_days)
    cutoff_timestamp = cutoff.timestamp()

    deleted_count = 0
    freed_bytes = 0
    for entry in os.scandir(run_logs_directory):
        # The prompt_reports subdirectory itself is permanent; prune inside it.
        if entry.is_dir() and entry.name == "prompt_reports":
            for report_entry in os.scandir(entry.path):
                if not report_entry.is_file():
                    continue
                if report_entry.stat().st_mtime >= cutoff_timestamp:
                    continue
                freed_bytes += report_entry.stat().st_size
                os.remove(report_entry.path)
                deleted_count += 1
            continue

        if entry.stat().st_mtime >= cutoff_timestamp:
            continue

        if entry.is_dir():
            freed_bytes += _directory_size_bytes(entry.path)
            shutil.rmtree(entry.path, ignore_errors=True)
        else:
            freed_bytes += entry.stat().st_size
            os.remove(entry.path)
        deleted_count += 1

    return PrunePromptReportsResponse(
        deleted_count=deleted_count, freed_bytes=freed_bytes
    )
