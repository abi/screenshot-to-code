from __future__ import annotations

from fastapi import APIRouter, HTTPException

from product_engine.orchestrator import ProductOrchestrator
from product_engine.schemas import (
    CreateJobRequest,
    CreateJobResponse,
    JobRecord,
    JobSummaryResponse,
)

router = APIRouter()
orchestrator = ProductOrchestrator()


@router.post("/api/product/jobs", response_model=CreateJobResponse)
def create_job(request: CreateJobRequest) -> CreateJobResponse:
    job = orchestrator.create_job(request)
    orchestrator.run_job(job.id)
    completed = orchestrator.get_job(job.id)
    return CreateJobResponse(job_id=completed.id, status=completed.status)


@router.get("/api/product/jobs", response_model=list[JobSummaryResponse])
def list_jobs() -> list[JobSummaryResponse]:
    return [
        JobSummaryResponse(
            id=job.id,
            status=job.status,
            mode=job.mode,
            export_target=job.export_target,
            created_at=job.created_at,
            updated_at=job.updated_at,
            failure_reason=job.failure_reason,
        )
        for job in orchestrator.list_jobs()
    ]


@router.get("/api/product/jobs/{job_id}", response_model=JobRecord)
def get_job(job_id: str) -> JobRecord:
    try:
        return orchestrator.get_job(job_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=f"Job not found: {job_id}") from exc
