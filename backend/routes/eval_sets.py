"""API for eval sets, eval sessions, and the per-session run matrix."""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from evals import sessions as eval_sessions
from evals import sets as eval_sets
from fs_logging.agent_runs import open_index_db
from routes.model_choice_sets import (
    ALL_KEYS_MODELS_DEFAULT,
    ALL_KEYS_MODELS_TEXT_CREATE,
)

router = APIRouter()

_STALE_RUNNING_AFTER = timedelta(hours=2)


class EvalSetSummaryModel(BaseModel):
    name: str
    display_name: str
    created_at: Optional[str]
    notes: str
    image_count: int
    kind: str = "image"


class EvalSetImageModel(BaseModel):
    filename: str
    sha256: str
    size_bytes: int
    tags: List[str]


class EvalSetBriefModel(BaseModel):
    id: str
    title: str
    brief: str
    tests: str


class EvalSetDetailModel(EvalSetSummaryModel):
    images: List[EvalSetImageModel]
    briefs: List[EvalSetBriefModel] = []


class EvalSessionModel(BaseModel):
    session_id: str
    name: str
    eval_set: str
    created_at: str
    is_active: bool


class EvalSessionListResponse(BaseModel):
    sessions: List[EvalSessionModel]
    active_session_id: Optional[str]


class CreateEvalSessionRequest(BaseModel):
    eval_set: str
    name: Optional[str] = None


class MatrixRunModel(BaseModel):
    run_id: str
    status: str
    source: str  # "eval" | "ui"
    total_duration_ms: Optional[int]
    total_cost_usd: Optional[float]
    created_at: str
    is_stale: bool


class MatrixCellModel(BaseModel):
    filename: str
    model: str
    runs: List[MatrixRunModel]  # newest first


class MatrixRowModel(BaseModel):
    filename: str  # image filename, or brief id for text sets
    sha256: Optional[str] = None
    image_url: Optional[str] = None
    title: Optional[str] = None
    brief: Optional[str] = None


class SessionMatrixResponse(BaseModel):
    session: EvalSessionModel
    eval_set: Optional[EvalSetSummaryModel]
    set_missing: bool
    rows: List[MatrixRowModel]
    models: List[str]
    model_notes: Dict[str, str]
    cells: List[MatrixCellModel]
    unmatched_run_count: int
    # Current production create defaults for the set's input kind.
    default_models: List[str] = []


class ModelOrderRequest(BaseModel):
    models: List[str]


class ModelNotesRequest(BaseModel):
    model: str
    notes: str


def _set_info_to_model(info: eval_sets.EvalSetInfo) -> EvalSetSummaryModel:
    return EvalSetSummaryModel(
        name=info.name,
        display_name=info.display_name,
        created_at=info.created_at,
        notes=info.notes,
        image_count=info.image_count,
        kind=info.kind,
    )


def _default_models_for_set(set_info: Optional[eval_sets.EvalSetInfo]) -> List[str]:
    if set_info is None:
        return []
    if set_info.kind == "text":
        return [model.value for model in ALL_KEYS_MODELS_TEXT_CREATE]
    return [model.value for model in ALL_KEYS_MODELS_DEFAULT]


def _session_to_model(session: eval_sessions.EvalSession) -> EvalSessionModel:
    return EvalSessionModel(
        session_id=session.session_id,
        name=session.name,
        eval_set=session.eval_set,
        created_at=session.created_at,
        is_active=session.is_active,
    )


@router.get("/eval-sets", response_model=List[EvalSetSummaryModel])
async def list_eval_sets() -> List[EvalSetSummaryModel]:
    return [_set_info_to_model(info) for info in eval_sets.list_sets()]


@router.get("/eval-sets/{set_name}", response_model=EvalSetDetailModel)
async def get_eval_set(set_name: str) -> EvalSetDetailModel:
    try:
        info = eval_sets.get_set(set_name)
        if info.kind == "text":
            briefs = eval_sets.list_set_briefs(set_name)
            return EvalSetDetailModel(
                **_set_info_to_model(info).model_dump(),
                images=[],
                briefs=[
                    EvalSetBriefModel(
                        id=b.id, title=b.title, brief=b.brief, tests=b.tests
                    )
                    for b in briefs
                ],
            )
        images = eval_sets.list_set_images(set_name)
    except eval_sets.InvalidSetNameError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except eval_sets.EvalSetNotFoundError:
        raise HTTPException(status_code=404, detail=f"Eval set not found: {set_name}")
    return EvalSetDetailModel(
        **_set_info_to_model(info).model_dump(),
        images=[
            EvalSetImageModel(
                filename=image.filename,
                sha256=image.sha256,
                size_bytes=image.size_bytes,
                tags=image.tags,
            )
            for image in images
        ],
    )


@router.get("/eval-sets/{set_name}/images/{filename}")
async def get_eval_set_image(set_name: str, filename: str) -> FileResponse:
    try:
        path = eval_sets.resolve_set_image_path(set_name, filename)
    except eval_sets.InvalidSetNameError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except eval_sets.EvalSetNotFoundError:
        raise HTTPException(status_code=404, detail=f"Eval set not found: {set_name}")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path)


@router.get("/eval-sessions", response_model=EvalSessionListResponse)
async def list_eval_sessions() -> EvalSessionListResponse:
    sessions = eval_sessions.list_sessions()
    active = next((s for s in sessions if s.is_active), None)
    return EvalSessionListResponse(
        sessions=[_session_to_model(s) for s in sessions],
        active_session_id=active.session_id if active else None,
    )


@router.get("/eval-sessions/active", response_model=Optional[EvalSessionModel])
async def get_active_eval_session() -> Optional[EvalSessionModel]:
    active = eval_sessions.get_active_session()
    return _session_to_model(active) if active else None


@router.post("/eval-sessions", response_model=EvalSessionModel)
async def create_eval_session(request: CreateEvalSessionRequest) -> EvalSessionModel:
    try:
        eval_sets.get_set(request.eval_set)
    except eval_sets.InvalidSetNameError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except eval_sets.EvalSetNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"Eval set not found: {request.eval_set}"
        )
    session = eval_sessions.create_session(request.eval_set, request.name)
    return _session_to_model(session)


@router.post(
    "/eval-sessions/{session_id}/activate", response_model=EvalSessionModel
)
async def activate_eval_session(session_id: str) -> EvalSessionModel:
    if eval_sessions.get_session(session_id) is None:
        raise HTTPException(status_code=404, detail="Session not found")
    session = eval_sessions.activate_session(session_id)
    assert session is not None
    return _session_to_model(session)


def _is_stale_running(status: str, created_at: str) -> bool:
    if status != "running":
        return False
    try:
        started = datetime.fromisoformat(created_at)
    except ValueError:
        return True
    return datetime.now() - started > _STALE_RUNNING_AFTER


@router.get(
    "/eval-sessions/{session_id}/matrix", response_model=SessionMatrixResponse
)
async def get_session_matrix(session_id: str) -> SessionMatrixResponse:
    session = eval_sessions.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    set_missing = False
    set_info: Optional[eval_sets.EvalSetInfo] = None
    images: List[eval_sets.EvalSetImage] = []
    briefs: List[eval_sets.EvalSetBrief] = []
    try:
        set_info = eval_sets.get_set(session.eval_set)
        if set_info.kind == "text":
            briefs = eval_sets.list_set_briefs(session.eval_set)
        else:
            images = eval_sets.list_set_images(session.eval_set)
    except (eval_sets.EvalSetNotFoundError, eval_sets.InvalidSetNameError):
        set_missing = True

    if briefs:
        rows = [
            MatrixRowModel(filename=b.id, title=b.title, brief=b.brief)
            for b in briefs
        ]
        set_filenames = {b.id for b in briefs}
    else:
        rows = [
            MatrixRowModel(
                filename=image.filename,
                sha256=image.sha256,
                image_url=f"/eval-sets/{session.eval_set}/images/{image.filename}",
            )
            for image in images
        ]
        set_filenames = {image.filename for image in images}
    filenames_by_sha: Dict[str, List[str]] = {}
    for image in images:
        filenames_by_sha.setdefault(image.sha256, []).append(image.filename)

    run_query_columns = (
        "run_id, model, status, total_duration_ms, total_cost_usd, "
        "created_at, input_file, input_image_sha256"
    )
    conn = open_index_db()
    try:
        eval_rows = conn.execute(
            f"SELECT {run_query_columns} FROM runs "
            "WHERE eval_session = ? ORDER BY created_at DESC, run_id DESC",
            (session_id,),
        ).fetchall()
        ui_rows: List[tuple[Any, ...]] = []
        if filenames_by_sha:
            placeholders = ", ".join("?" for _ in filenames_by_sha)
            ui_rows = conn.execute(
                f"SELECT {run_query_columns} FROM runs "
                "WHERE eval_session IS NULL AND entry_point != 'eval' "
                f"AND created_at >= ? AND input_image_sha256 IN ({placeholders}) "
                "ORDER BY created_at DESC, run_id DESC",
                (session.created_at, *filenames_by_sha.keys()),
            ).fetchall()
    finally:
        conn.close()

    # (filename, model) -> runs, insertion-ordered so cells stay newest-first.
    cell_runs: Dict[tuple[str, str], List[MatrixRunModel]] = {}
    model_first_seen: Dict[str, str] = {}
    unmatched_run_count = 0

    def add_run(filename: str, row: tuple[Any, ...], source: str) -> None:
        run_id, model, status, duration, cost, created_at = row[:6]
        cell_runs.setdefault((filename, model), []).append(
            MatrixRunModel(
                run_id=run_id,
                status=status,
                source=source,
                total_duration_ms=duration,
                total_cost_usd=cost,
                created_at=created_at,
                is_stale=_is_stale_running(status, created_at),
            )
        )
        # Rows are scanned newest-first; keep overwriting so the oldest
        # occurrence wins and columns order by first use in the session.
        model_first_seen[model] = created_at

    for row in eval_rows:
        input_file = row[6]
        # With a missing set the cells still carry the session's history;
        # otherwise runs whose file left the set are counted, not shown.
        if input_file and (set_missing or input_file in set_filenames):
            add_run(input_file, row, "eval")
        else:
            unmatched_run_count += 1

    for row in ui_rows:
        sha = row[7]
        for filename in filenames_by_sha.get(sha, []):
            add_run(filename, row, "ui")

    # Saved per-session column order wins; models without a saved position
    # append afterwards in first-use order.
    meta = eval_sessions.get_model_meta(session_id)
    positions = {
        model: m.position for model, m in meta.items() if m.position is not None
    }
    models = sorted(
        model_first_seen,
        key=lambda m: (
            0 if m in positions else 1,
            positions.get(m, 0),
            model_first_seen[m],
        ),
    )
    model_notes = {
        model: meta[model].notes
        for model in models
        if model in meta and meta[model].notes
    }
    cells = [
        MatrixCellModel(filename=filename, model=model, runs=runs)
        for (filename, model), runs in cell_runs.items()
    ]

    return SessionMatrixResponse(
        session=_session_to_model(session),
        eval_set=_set_info_to_model(set_info) if set_info else None,
        set_missing=set_missing,
        rows=rows,
        models=models,
        model_notes=model_notes,
        cells=cells,
        unmatched_run_count=unmatched_run_count,
        default_models=_default_models_for_set(set_info),
    )


@router.put("/eval-sessions/{session_id}/model-order")
async def set_session_model_order(
    session_id: str, request: ModelOrderRequest
) -> Dict[str, str]:
    if eval_sessions.get_session(session_id) is None:
        raise HTTPException(status_code=404, detail="Session not found")
    eval_sessions.set_model_order(session_id, request.models)
    return {"status": "ok"}


@router.put("/eval-sessions/{session_id}/model-notes")
async def set_session_model_notes(
    session_id: str, request: ModelNotesRequest
) -> Dict[str, str]:
    if eval_sessions.get_session(session_id) is None:
        raise HTTPException(status_code=404, detail="Session not found")
    eval_sessions.set_model_notes(session_id, request.model, request.notes)
    return {"status": "ok"}
