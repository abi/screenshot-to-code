import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, cast
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel

router = APIRouter()


class DesignSystem(BaseModel):
    id: str
    name: str
    content: str
    createdAt: str
    updatedAt: str


class CreateDesignSystemRequest(BaseModel):
    name: str
    content: str


class UpdateDesignSystemRequest(BaseModel):
    name: str | None = None
    content: str | None = None


def get_design_systems_file_path() -> Path:
    data_dir = os.environ.get("SCREENSHOT_TO_CODE_DATA_DIR")
    base_path = Path(data_dir).expanduser() if data_dir else Path.home() / ".screenshot-to-code"
    return base_path / "design-systems.json"


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_name(name: str) -> str:
    normalized = name.strip()
    if not normalized:
        raise HTTPException(status_code=400, detail="Design system name is required")
    return normalized


def parse_design_system(raw_item: Any) -> DesignSystem | None:
    if not isinstance(raw_item, dict):
        return None

    try:
        return DesignSystem(
            id=str(raw_item["id"]),
            name=str(raw_item["name"]),
            content=str(raw_item.get("content", "")),
            createdAt=str(raw_item["createdAt"]),
            updatedAt=str(raw_item["updatedAt"]),
        )
    except KeyError:
        return None


def read_design_systems() -> list[DesignSystem]:
    file_path = get_design_systems_file_path()
    if not file_path.exists():
        return []

    try:
        raw_items = cast(list[Any], json.loads(file_path.read_text(encoding="utf-8")))
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=500,
            detail="Design systems storage is not valid JSON",
        ) from exc

    if not isinstance(raw_items, list):
        raise HTTPException(
            status_code=500,
            detail="Design systems storage must contain a list",
        )

    design_systems: list[DesignSystem] = []
    for raw_item in raw_items:
        design_system = parse_design_system(raw_item)
        if design_system:
            design_systems.append(design_system)
    return design_systems


def write_design_systems(design_systems: list[DesignSystem]) -> None:
    file_path = get_design_systems_file_path()
    file_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = file_path.with_suffix(".json.tmp")
    serialized = json.dumps(
        [design_system.model_dump() for design_system in design_systems],
        indent=2,
    )
    tmp_path.write_text(f"{serialized}\n", encoding="utf-8")
    tmp_path.replace(file_path)


@router.get("/api/design-systems")
async def list_design_systems() -> list[DesignSystem]:
    return read_design_systems()


@router.post("/api/design-systems")
async def create_design_system(request: CreateDesignSystemRequest) -> DesignSystem:
    design_systems = read_design_systems()
    timestamp = utc_timestamp()
    design_system = DesignSystem(
        id=str(uuid4()),
        name=normalize_name(request.name),
        content=request.content,
        createdAt=timestamp,
        updatedAt=timestamp,
    )
    design_systems.append(design_system)
    write_design_systems(design_systems)
    return design_system


@router.patch("/api/design-systems/{design_system_id}")
async def update_design_system(
    design_system_id: str, request: UpdateDesignSystemRequest
) -> DesignSystem:
    design_systems = read_design_systems()
    for index, design_system in enumerate(design_systems):
        if design_system.id != design_system_id:
            continue

        updated = design_system.model_copy(
            update={
                "name": normalize_name(request.name)
                if request.name is not None
                else design_system.name,
                "content": request.content
                if request.content is not None
                else design_system.content,
                "updatedAt": utc_timestamp(),
            }
        )
        design_systems[index] = updated
        write_design_systems(design_systems)
        return updated

    raise HTTPException(status_code=404, detail="Design system not found")


@router.delete("/api/design-systems/{design_system_id}")
async def delete_design_system(design_system_id: str) -> Response:
    design_systems = read_design_systems()
    remaining = [
        design_system
        for design_system in design_systems
        if design_system.id != design_system_id
    ]

    if len(remaining) == len(design_systems):
        raise HTTPException(status_code=404, detail="Design system not found")

    write_design_systems(remaining)
    return Response(status_code=204)
