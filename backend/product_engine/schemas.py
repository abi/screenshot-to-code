from __future__ import annotations

from enum import Enum
from typing import Any, Literal, cast

from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    ANALYZING = "analyzing"
    GENERATING = "generating"
    VALIDATING = "validating"
    REPAIRING = "repairing"
    COMPLETED = "completed"
    PARTIAL = "partial"
    FAILED = "failed"
    CANCELED = "canceled"


class Bounds(BaseModel):
    x: float
    y: float
    width: float
    height: float


class SourceRegion(BaseModel):
    id: str
    screenshot_id: str
    bounds: Bounds
    confidence: float = Field(ge=0, le=1)
    region_type: Literal["section", "group", "component", "text", "media"]


class ResponsiveHints(BaseModel):
    breakpoint: Literal["mobile", "tablet", "desktop", "unknown"] = "unknown"
    behavior: str = "stack"
    confidence: float = Field(ge=0, le=1, default=0.3)


class IRNode(BaseModel):
    id: str
    parentId: str | None
    type: str
    semanticRole: str
    bounds: Bounds
    children: list[str] = Field(default_factory=list)
    textContent: str | None = None
    imageRef: str | None = None
    styleHints: dict[str, Any] = Field(default_factory=dict)
    tokenRefs: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)
    responsiveHints: ResponsiveHints = Field(default_factory=ResponsiveHints)
    interactionHints: dict[str, Any] = Field(default_factory=dict)
    accessibilityHints: dict[str, Any] = Field(default_factory=dict)
    repeatGroupId: str | None = None
    sourceRegionId: str | None = None


class TokenSnapshot(BaseModel):
    colors: dict[str, str] = Field(default_factory=dict)
    spacing: dict[str, str] = Field(default_factory=dict)
    typography: dict[str, str] = Field(default_factory=dict)
    radii: dict[str, str] = Field(default_factory=dict)
    shadows: dict[str, str] = Field(default_factory=dict)


class IRSnapshot(BaseModel):
    project: dict[str, Any]
    pages: list[dict[str, Any]]
    source_regions: list[SourceRegion]
    nodes: list[IRNode]


class ValidationReport(BaseModel):
    schema_valid: bool
    import_valid: bool
    dead_output_detected: bool
    runtime_smoke_valid: bool
    responsive_sanity: bool
    accessibility_valid: bool
    visual_compare_available: bool
    visual_similarity: float = Field(ge=0, le=1)
    issues: list[str] = Field(default_factory=list)


class RepairAction(BaseModel):
    scope: Literal["file", "component", "page", "project"]
    reason: str
    applied: bool
    details: dict[str, Any] = Field(default_factory=dict)


ExportTarget = Literal[
    "html-tailwind",
    "react",
    "nextjs-pages-ts-tailwind-v4",
    "component-json",
    "ir-json",
    "design-tokens-json",
]


class ExportManifest(BaseModel):
    target: ExportTarget
    files: list[str]
    archive_path: str | None


class JobArtifacts(BaseModel):
    ocr: dict[str, Any] = Field(default_factory=dict)
    regions: list[SourceRegion] = Field(default_factory=lambda: cast(list[SourceRegion], []))
    ir: IRSnapshot | None = None
    tokens: TokenSnapshot | None = None
    files: dict[str, str] = Field(default_factory=dict)
    validation: ValidationReport | None = None
    repairs: list[RepairAction] = Field(default_factory=lambda: cast(list[RepairAction], []))
    exports: list[ExportManifest] = Field(default_factory=lambda: cast(list[ExportManifest], []))


class JobRecord(BaseModel):
    id: str
    status: JobStatus
    mode: str
    export_target: str
    created_at: str
    updated_at: str
    inputs: dict[str, Any]
    logs: list[str] = Field(default_factory=list)
    timings_ms: dict[str, int] = Field(default_factory=dict)
    artifacts: JobArtifacts = Field(default_factory=JobArtifacts)
    failure_reason: str | None = None


class CreateJobRequest(BaseModel):
    mode: Literal[
        "screenshot_to_code",
        "screenshot_to_project_patch",
        "multi_screenshot_merge",
        "compare_and_repair",
        "refactor_existing_code",
        "token_extract",
        "component_detect",
        "structure_inspect",
        "export",
    ] = "screenshot_to_code"
    export_target: ExportTarget = "nextjs-pages-ts-tailwind-v4"
    screenshot_data_urls: list[str] = Field(default_factory=list)
    screenshot_notes: str | None = None
    existing_project_files: dict[str, str] = Field(default_factory=dict)
    user_instructions: str | None = None


class CreateJobResponse(BaseModel):
    job_id: str
    status: JobStatus


class JobSummaryResponse(BaseModel):
    id: str
    status: JobStatus
    mode: str
    export_target: str
    created_at: str
    updated_at: str
    failure_reason: str | None
