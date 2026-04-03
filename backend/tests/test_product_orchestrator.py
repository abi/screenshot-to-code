from __future__ import annotations

import base64
from io import BytesIO
from pathlib import Path

from PIL import Image

from product_engine.orchestrator import ProductOrchestrator
from product_engine.schemas import CreateJobRequest, JobStatus
from product_engine.storage import JobStorage


def _png_data_url(color: tuple[int, int, int] = (255, 255, 255)) -> str:
    image = Image.new("RGB", (320, 240), color=color)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


def test_orchestrator_create_and_run_job(tmp_path: Path) -> None:
    orchestrator = ProductOrchestrator(storage=JobStorage(root=tmp_path / "jobs"))

    request = CreateJobRequest(
        mode="multi_screenshot_merge",
        export_target="nextjs-pages-ts-tailwind-v4",
        screenshot_data_urls=[_png_data_url((240, 240, 240)), _png_data_url((20, 20, 20))],
        screenshot_notes="Header / cards / CTA",
        user_instructions="Prefer reusable components",
    )

    created = orchestrator.create_job(request)
    completed = orchestrator.run_job(created.id)

    assert completed.status in (JobStatus.COMPLETED, JobStatus.PARTIAL)
    assert completed.artifacts.ir is not None
    assert completed.artifacts.tokens is not None
    assert "pages/index.tsx" in completed.artifacts.files
    assert completed.artifacts.validation is not None
    assert completed.artifacts.exports
    assert completed.artifacts.exports[0].archive_path is not None


def test_orchestrator_lists_jobs(tmp_path: Path) -> None:
    storage = JobStorage(root=tmp_path / "jobs")
    orchestrator = ProductOrchestrator(storage=storage)
    created = orchestrator.create_job(CreateJobRequest(screenshot_data_urls=[_png_data_url()]))
    orchestrator.run_job(created.id)

    jobs = orchestrator.list_jobs()
    assert len(jobs) == 1
    assert jobs[0].id == created.id
