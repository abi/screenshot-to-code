from __future__ import annotations

from product_engine.schemas import RepairAction, ValidationReport


def run_repairs(files: dict[str, str], report: ValidationReport) -> tuple[dict[str, str], list[RepairAction]]:
    repairs: list[RepairAction] = []

    if "Tailwind v4 import mismatch in styles/globals.css" in report.issues:
        files["styles/globals.css"] = '@import "tailwindcss";\n'
        repairs.append(
            RepairAction(
                scope="file",
                reason="Normalized Tailwind v4 import in globals.css",
                applied=True,
                details={"file": "styles/globals.css"},
            )
        )

    if report.dead_output_detected and "pages/index.tsx" not in files:
        files["pages/index.tsx"] = "export default function Home(){return <main />;}\n"
        repairs.append(
            RepairAction(
                scope="page",
                reason="Added fallback page to avoid empty export",
                applied=True,
                details={"file": "pages/index.tsx"},
            )
        )

    return files, repairs
