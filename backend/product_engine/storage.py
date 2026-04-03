from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from product_engine.schemas import JobRecord


class JobStorage:
    def __init__(self, root: Path | None = None):
        self.root = root or Path(__file__).resolve().parents[1] / ".product_jobs"
        self.root.mkdir(parents=True, exist_ok=True)

    def now_iso(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def job_dir(self, job_id: str) -> Path:
        job_dir = self.root / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        return job_dir

    def write_json(self, path: Path, payload: dict) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def save_job(self, job: JobRecord) -> None:
        self.write_json(self.job_dir(job.id) / "job.json", job.model_dump(mode="json"))

    def load_job(self, job_id: str) -> JobRecord:
        path = self.job_dir(job_id) / "job.json"
        if not path.exists():
            raise FileNotFoundError(job_id)
        payload = json.loads(path.read_text(encoding="utf-8"))
        return JobRecord.model_validate(payload)

    def list_jobs(self) -> list[JobRecord]:
        jobs: list[JobRecord] = []
        for path in self.root.glob("*/job.json"):
            payload = json.loads(path.read_text(encoding="utf-8"))
            jobs.append(JobRecord.model_validate(payload))
        return sorted(jobs, key=lambda item: item.created_at, reverse=True)
