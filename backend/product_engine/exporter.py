from __future__ import annotations

import zipfile
from pathlib import Path
from product_engine.schemas import ExportManifest, ExportTarget


def write_export(job_dir: Path, target: ExportTarget, files: dict[str, str]) -> ExportManifest:
    export_dir = job_dir / "exports" / target
    export_dir.mkdir(parents=True, exist_ok=True)

    written_files: list[str] = []
    for relative_path, content in files.items():
        path = export_dir / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        written_files.append(relative_path)

    archive_path = export_dir.with_suffix(".zip")
    with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for relative_path in written_files:
            archive.write(export_dir / relative_path, arcname=relative_path)

    return ExportManifest(target=target, files=sorted(written_files), archive_path=str(archive_path))
