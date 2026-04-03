from __future__ import annotations

import time
import uuid
from pathlib import Path

from product_engine.analysis import analyze_inputs
from product_engine.exporter import write_export
from product_engine.generation import generate_project
from product_engine.repair import run_repairs
from product_engine.schemas import CreateJobRequest, JobRecord, JobStatus
from product_engine.storage import JobStorage
from product_engine.validation import validate_output


class ProductOrchestrator:
    def __init__(self, storage: JobStorage | None = None):
        self.storage = storage or JobStorage()

    def create_job(self, request: CreateJobRequest) -> JobRecord:
        now = self.storage.now_iso()
        job = JobRecord(
            id=str(uuid.uuid4()),
            status=JobStatus.QUEUED,
            mode=request.mode,
            export_target=request.export_target,
            created_at=now,
            updated_at=now,
            inputs=request.model_dump(mode="json"),
        )
        self.storage.save_job(job)
        return job

    def _transition(self, job: JobRecord, status: JobStatus, log: str) -> None:
        job.status = status
        job.updated_at = self.storage.now_iso()
        job.logs.append(log)
        self.storage.save_job(job)

    def run_job(self, job_id: str) -> JobRecord:
        job = self.storage.load_job(job_id)
        request = CreateJobRequest.model_validate(job.inputs)
        job_dir = self.storage.job_dir(job.id)

        try:
            self._transition(job, JobStatus.RUNNING, "Job started")

            start = time.perf_counter()
            self._transition(job, JobStatus.ANALYZING, "Running image analysis")
            analysis = analyze_inputs(request.screenshot_data_urls, request.screenshot_notes)
            job.artifacts.ocr = analysis.ocr
            job.artifacts.regions = analysis.regions
            job.timings_ms["analysis"] = int((time.perf_counter() - start) * 1000)
            self.storage.save_job(job)

            start = time.perf_counter()
            self._transition(job, JobStatus.GENERATING, "Generating IR, tokens, and files")
            generated = generate_project(
                mode=request.mode,
                export_target=request.export_target,
                analysis=analysis,
                user_instructions=request.user_instructions,
            )
            job.artifacts.ir = generated.ir
            job.artifacts.tokens = generated.tokens
            job.artifacts.files = generated.files
            job.timings_ms["generation"] = int((time.perf_counter() - start) * 1000)
            self.storage.save_job(job)

            start = time.perf_counter()
            self._transition(job, JobStatus.VALIDATING, "Running validation checks")
            report = validate_output(request.export_target, generated.ir, dict(generated.files))
            job.artifacts.validation = report
            job.timings_ms["validation"] = int((time.perf_counter() - start) * 1000)
            self.storage.save_job(job)

            if report.issues:
                start = time.perf_counter()
                self._transition(job, JobStatus.REPAIRING, "Applying scoped deterministic repairs")
                repaired_files, repairs = run_repairs(dict(job.artifacts.files), report)
                job.artifacts.files = repaired_files
                job.artifacts.repairs.extend(repairs)
                report = validate_output(request.export_target, generated.ir, repaired_files)
                job.artifacts.validation = report
                job.timings_ms["repair"] = int((time.perf_counter() - start) * 1000)
                self.storage.save_job(job)

            manifest = write_export(Path(job_dir), request.export_target, job.artifacts.files)
            job.artifacts.exports = [manifest]

            if job.artifacts.validation and not job.artifacts.validation.dead_output_detected and job.artifacts.validation.schema_valid:
                self._transition(job, JobStatus.COMPLETED, "Job completed")
            else:
                self._transition(job, JobStatus.PARTIAL, "Job completed with partial quality")

            return self.storage.load_job(job_id)
        except Exception as exc:  # noqa: BLE001
            job.failure_reason = str(exc)
            self._transition(job, JobStatus.FAILED, f"Job failed: {exc}")
            return self.storage.load_job(job_id)

    def get_job(self, job_id: str) -> JobRecord:
        return self.storage.load_job(job_id)

    def list_jobs(self) -> list[JobRecord]:
        return self.storage.list_jobs()
