import base64
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional

import pytest
from fastapi import HTTPException

import evals.config
from evals.sessions import (
    SessionSetMismatchError,
    activate_session,
    create_session,
    get_active_session,
    list_sessions,
    resolve_session_for_run,
    completed_eval_inputs,
)
from fs_logging.agent_runs import (
    AgentRunRecorder,
    get_agent_runs_db_path,
    get_agent_runs_directory,
    open_index_db,
)
from llm import Llm


@pytest.fixture
def logs_path(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setenv("LOGS_PATH", str(tmp_path))
    return tmp_path


@pytest.fixture
def evals_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setattr(evals.config, "EVALS_DIR", str(tmp_path / "evals_data"))
    return tmp_path / "evals_data"


def _make_set(evals_dir: Path, name: str, images: dict[str, bytes]) -> None:
    inputs = evals_dir / "sets" / name / "inputs"
    inputs.mkdir(parents=True)
    for filename, content in images.items():
        (inputs / filename).write_bytes(content)


# The runs DDL exactly as first shipped, before the eval columns existed.
_LEGACY_RUNS_DDL = """
CREATE TABLE runs (
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
  size_bytes        INTEGER
)
"""


def test_migration_upgrades_legacy_db(logs_path: Path) -> None:
    db_dir = Path(get_agent_runs_directory())
    db_dir.mkdir(parents=True)
    conn = sqlite3.connect(get_agent_runs_db_path())
    conn.execute(_LEGACY_RUNS_DDL)
    conn.execute(
        "INSERT INTO runs (run_id, generation_id, variant_index, entry_point, "
        "status, created_at, run_dir) VALUES ('run_legacy', 'gen_x', 0, "
        "'websocket', 'completed', '2026-07-01T10:00:00', '/tmp/x')"
    )
    conn.commit()
    conn.close()

    migrated = open_index_db()
    try:
        columns = {row[1] for row in migrated.execute("PRAGMA table_info(runs)")}
        assert {
            "eval_session",
            "eval_set",
            "input_file",
            "input_image_sha256",
        } <= columns
        row = migrated.execute(
            "SELECT status, eval_session, eval_set, input_file FROM runs "
            "WHERE run_id = 'run_legacy'"
        ).fetchone()
        assert row == ("completed", None, None, None)
        tables = {
            r[0]
            for r in migrated.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            )
        }
        assert "eval_sessions" in tables
    finally:
        migrated.close()

    # Idempotent on reopen.
    open_index_db().close()


def _active_count() -> int:
    conn = sqlite3.connect(get_agent_runs_db_path())
    try:
        return conn.execute(
            "SELECT COUNT(*) FROM eval_sessions WHERE is_active = 1"
        ).fetchone()[0]
    finally:
        conn.close()


def test_create_and_activate_single_active_invariant(logs_path: Path) -> None:
    first = create_session("set-a", "first")
    assert first.is_active
    second = create_session("set-b")
    assert second.name.endswith("session")  # auto-named
    assert _active_count() == 1
    active = get_active_session()
    assert active is not None and active.session_id == second.session_id

    activate_session(first.session_id)
    assert _active_count() == 1
    active = get_active_session()
    assert active is not None and active.session_id == first.session_id

    sessions = list_sessions()
    assert {s.session_id for s in sessions} == {
        first.session_id,
        second.session_id,
    }


def test_resolve_session_for_run(logs_path: Path) -> None:
    # No session: auto-creates and activates.
    session = resolve_session_for_run("set-a")
    assert session.is_active and session.eval_set == "set-a"
    # Same set: reuses.
    again = resolve_session_for_run("set-a")
    assert again.session_id == session.session_id
    # Different set: refuses.
    with pytest.raises(SessionSetMismatchError):
        resolve_session_for_run("set-b")


def _record_run(
    *,
    model: Llm = Llm.GPT_5_5_HIGH,
    entry_point: str = "eval",
    eval_session: Optional[str] = None,
    eval_set: Optional[str] = None,
    input_file: Optional[str] = None,
    image_bytes: Optional[bytes] = None,
    stack: str = "html_tailwind",
) -> AgentRunRecorder:
    recorder = AgentRunRecorder(
        generation_id="gen_t",
        variant_index=0,
        entry_point=entry_point,
        stack=stack,
        enabled=True,
        eval_session=eval_session,
        eval_set=eval_set,
        input_file=input_file,
    )
    prompt: list[Any] = []
    if image_bytes is not None:
        data_url = "data:image/png;base64," + base64.b64encode(
            image_bytes
        ).decode("ascii")
        prompt = [
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": data_url}}
                ],
            }
        ]
    recorder.record_run_start(model, prompt)
    return recorder


def _set_run_status(
    run_id: str, status: str, created_at: Optional[str] = None
) -> None:
    conn = sqlite3.connect(get_agent_runs_db_path())
    try:
        conn.execute(
            "UPDATE runs SET status = ? WHERE run_id = ?", (status, run_id)
        )
        if created_at is not None:
            conn.execute(
                "UPDATE runs SET created_at = ? WHERE run_id = ?",
                (created_at, run_id),
            )
        conn.commit()
    finally:
        conn.close()


def test_recorder_eval_columns_and_websocket_sha(logs_path: Path) -> None:
    eval_recorder = _record_run(
        eval_session="sess_x",
        eval_set="set-a",
        input_file="shop.png",
        image_bytes=b"shop-image",
    )
    ui_recorder = _record_run(entry_point="websocket", image_bytes=b"ui-image")
    garbage_recorder = AgentRunRecorder(
        generation_id="g", variant_index=0, entry_point="websocket", enabled=True
    )
    garbage_recorder.record_run_start(Llm.GPT_5_5_HIGH, {"not": "a list"})

    conn = sqlite3.connect(get_agent_runs_db_path())
    try:
        rows = {
            row[0]: row
            for row in conn.execute(
                "SELECT run_id, eval_session, eval_set, input_file, "
                "input_image_sha256 FROM runs"
            )
        }
    finally:
        conn.close()

    import hashlib

    eval_row = rows[eval_recorder.run_id]
    assert eval_row[1:4] == ("sess_x", "set-a", "shop.png")
    assert eval_row[4] == hashlib.sha256(b"shop-image").hexdigest()

    ui_row = rows[ui_recorder.run_id]
    assert ui_row[1:4] == (None, None, None)
    assert ui_row[4] == hashlib.sha256(b"ui-image").hexdigest()

    assert rows[garbage_recorder.run_id][4] is None


def test_completed_eval_inputs(logs_path: Path) -> None:
    session = create_session("set-a")
    done = _record_run(
        eval_session=session.session_id, eval_set="set-a", input_file="a.png"
    )
    _set_run_status(done.run_id, "completed")
    failed = _record_run(
        eval_session=session.session_id, eval_set="set-a", input_file="b.png"
    )
    _set_run_status(failed.run_id, "failed")
    _record_run(
        eval_session=session.session_id,
        eval_set="set-a",
        input_file="c.png",
        model=Llm.CLAUDE_OPUS_4_8_HIGH,
    )

    completed = completed_eval_inputs(
        session.session_id, Llm.GPT_5_5_HIGH.value, "html_tailwind"
    )
    assert completed == {"a.png"}


@pytest.mark.asyncio
async def test_session_matrix(logs_path: Path, evals_dir: Path) -> None:
    from routes.eval_sets import get_session_matrix

    _make_set(
        evals_dir, "set-a", {"one.png": b"image-one", "two.png": b"image-two"}
    )
    session = create_session("set-a")

    completed = _record_run(
        eval_session=session.session_id, eval_set="set-a", input_file="one.png"
    )
    _set_run_status(completed.run_id, "completed")
    failed = _record_run(
        eval_session=session.session_id,
        eval_set="set-a",
        input_file="one.png",
        model=Llm.CLAUDE_OPUS_4_8_HIGH,
    )
    _set_run_status(failed.run_id, "failed")
    running = _record_run(
        eval_session=session.session_id, eval_set="set-a", input_file="two.png"
    )
    stale_time = (datetime.now() - timedelta(hours=3)).isoformat(
        timespec="seconds"
    )
    stale = _record_run(
        eval_session=session.session_id,
        eval_set="set-a",
        input_file="two.png",
        model=Llm.CLAUDE_OPUS_4_8_HIGH,
    )
    _set_run_status(stale.run_id, "running", created_at=stale_time)
    orphan = _record_run(
        eval_session=session.session_id, eval_set="set-a", input_file="gone.png"
    )
    _set_run_status(orphan.run_id, "completed")

    # UI run after session start with a matching image hash: included.
    ui_match = _record_run(entry_point="websocket", image_bytes=b"image-one")
    _set_run_status(ui_match.run_id, "completed")
    # UI run BEFORE session start: excluded.
    ui_before = _record_run(entry_point="websocket", image_bytes=b"image-one")
    _set_run_status(
        ui_before.run_id, "completed", created_at="2020-01-01T00:00:00"
    )

    matrix = await get_session_matrix(session.session_id)
    assert not matrix.set_missing
    assert [row.filename for row in matrix.rows] == ["one.png", "two.png"]
    assert set(matrix.models) == {
        Llm.GPT_5_5_HIGH.value,
        Llm.CLAUDE_OPUS_4_8_HIGH.value,
    }
    assert matrix.unmatched_run_count == 1

    cells = {(c.filename, c.model): c for c in matrix.cells}
    one_gpt = cells[("one.png", Llm.GPT_5_5_HIGH.value)]
    assert {r.run_id for r in one_gpt.runs} == {
        completed.run_id,
        ui_match.run_id,
    }
    sources = {r.run_id: r.source for r in one_gpt.runs}
    assert sources[ui_match.run_id] == "ui"
    assert sources[completed.run_id] == "eval"
    assert ui_before.run_id not in sources

    one_claude = cells[("one.png", Llm.CLAUDE_OPUS_4_8_HIGH.value)]
    assert one_claude.runs[0].status == "failed"

    two_gpt = cells[("two.png", Llm.GPT_5_5_HIGH.value)]
    assert two_gpt.runs[0].status == "running"
    assert two_gpt.runs[0].is_stale is False
    two_claude = cells[("two.png", Llm.CLAUDE_OPUS_4_8_HIGH.value)]
    assert two_claude.runs[0].is_stale is True


@pytest.mark.asyncio
async def test_session_matrix_text_set(
    logs_path: Path, evals_dir: Path
) -> None:
    import json as json_module

    from routes.eval_sets import get_session_matrix

    set_dir = evals_dir / "sets" / "briefs-v1"
    set_dir.mkdir(parents=True)
    (set_dir / "briefs.json").write_text(
        json_module.dumps(
            {
                "briefs": [
                    {"id": "pdp", "title": "PDP", "brief": "Build a product page."},
                    {"id": "board", "brief": "Build a kanban board."},
                ]
            }
        )
    )
    session = create_session("briefs-v1")
    run = _record_run(
        eval_session=session.session_id, eval_set="briefs-v1", input_file="pdp"
    )
    _set_run_status(run.run_id, "completed")

    matrix = await get_session_matrix(session.session_id)
    assert not matrix.set_missing
    assert [(r.filename, r.title) for r in matrix.rows] == [
        ("pdp", "PDP"),
        ("board", "board"),
    ]
    assert matrix.rows[0].image_url is None
    assert matrix.rows[0].brief == "Build a product page."
    cells = {(c.filename, c.model) for c in matrix.cells}
    assert ("pdp", Llm.GPT_5_5_HIGH.value) in cells
    assert matrix.unmatched_run_count == 0

    from routes.model_choice_sets import ALL_KEYS_MODELS_TEXT_CREATE

    assert matrix.default_models == [m.value for m in ALL_KEYS_MODELS_TEXT_CREATE]


@pytest.mark.asyncio
async def test_session_matrix_missing_set(
    logs_path: Path, evals_dir: Path
) -> None:
    from routes.eval_sets import get_session_matrix

    session = create_session("never-existed")
    run = _record_run(
        eval_session=session.session_id,
        eval_set="never-existed",
        input_file="x.png",
    )
    _set_run_status(run.run_id, "completed")

    matrix = await get_session_matrix(session.session_id)
    assert matrix.set_missing is True
    assert matrix.rows == []
    # History still browsable through cells.
    assert any(c.filename == "x.png" for c in matrix.cells)


@pytest.mark.asyncio
async def test_run_evals_threads_set_and_session(
    logs_path: Path, evals_dir: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    import routes.evals as evals_routes
    from routes.evals import RunEvalsRequest, run_evals

    _make_set(evals_dir, "set-a", {"a.png": b"a", "b.png": b"b"})
    _make_set(evals_dir, "set-b", {"x.png": b"x"})

    captured: list[dict[str, Any]] = []

    async def fake_run_image_evals(**kwargs: Any) -> list[str]:
        captured.append(kwargs)
        return []

    monkeypatch.setattr(evals_routes, "run_image_evals", fake_run_image_evals)

    # Seed a completed combo so diff mode skips it.
    session = create_session("set-a")
    done = _record_run(
        eval_session=session.session_id, eval_set="set-a", input_file="a.png"
    )
    _set_run_status(done.run_id, "completed")

    await run_evals(
        RunEvalsRequest(
            models=[Llm.GPT_5_5_HIGH.value],
            stack="html_tailwind",
            set_name="set-a",
            diff_mode=True,
        )
    )
    assert len(captured) == 1
    kwargs = captured[0]
    assert kwargs["eval_set"] == "set-a"
    assert kwargs["eval_session_id"] == session.session_id
    assert kwargs["skip_input_files"] == {"a.png"}

    # Mismatched active session -> 400 with guidance.
    with pytest.raises(HTTPException) as excinfo:
        await run_evals(
            RunEvalsRequest(
                models=[Llm.GPT_5_5_HIGH.value],
                stack="html_tailwind",
                set_name="set-b",
            )
        )
    assert excinfo.value.status_code == 400
    assert "Start a new session" in str(excinfo.value.detail)

    # Unknown set -> 404.
    create_session("set-a")  # keep active pinned to an existing set
    with pytest.raises(HTTPException) as excinfo:
        await run_evals(
            RunEvalsRequest(
                models=[Llm.GPT_5_5_HIGH.value],
                stack="html_tailwind",
                set_name="missing-set",
            )
        )
    assert excinfo.value.status_code == 404


def test_count_pending_eval_tasks_with_set(
    logs_path: Path, evals_dir: Path
) -> None:
    from evals.runner import count_pending_eval_tasks

    _make_set(evals_dir, "set-a", {"a.png": b"a", "b.png": b"b", "c.png": b"c"})

    pending, skipped = count_pending_eval_tasks(
        stack="html_tailwind",
        model=Llm.GPT_5_5_HIGH.value,
        diff_mode=True,
        eval_set="set-a",
        skip_input_files={"a.png"},
    )
    assert (pending, skipped) == (2, 1)

    pending, skipped = count_pending_eval_tasks(
        stack="html_tailwind",
        model=Llm.GPT_5_5_HIGH.value,
        diff_mode=False,
        eval_set="set-a",
    )
    assert (pending, skipped) == (3, 0)


@pytest.mark.asyncio
async def test_session_matrix_default_models(
    logs_path: Path, evals_dir: Path
) -> None:
    from routes.eval_sets import get_session_matrix
    from routes.model_choice_sets import ALL_KEYS_MODELS_DEFAULT

    _make_set(evals_dir, "set-a", {"one.png": b"image-one"})
    session = create_session("set-a")

    matrix = await get_session_matrix(session.session_id)
    assert matrix.default_models == [m.value for m in ALL_KEYS_MODELS_DEFAULT]
