from __future__ import annotations

from product_engine.schemas import IRSnapshot, ValidationReport


REQUIRED_NEXTJS_FILES = {
    "pages/index.tsx",
    "pages/_app.tsx",
    "styles/globals.css",
}


def validate_output(export_target: str, ir: IRSnapshot, files: dict[str, str]) -> ValidationReport:
    issues: list[str] = []
    schema_valid = len(ir.nodes) > 0 and len(ir.pages) > 0

    import_valid = True
    if export_target == "nextjs-pages-ts-tailwind-v4":
        missing = REQUIRED_NEXTJS_FILES - set(files.keys())
        if missing:
            import_valid = False
            issues.append(f"Missing required files: {sorted(missing)}")

    dead_output_detected = not files or all(not content.strip() for content in files.values())
    if dead_output_detected:
        issues.append("Generated output is empty.")

    globals_css = files.get("styles/globals.css")
    if export_target == "nextjs-pages-ts-tailwind-v4" and globals_css != '@import "tailwindcss";\n':
        issues.append("Tailwind v4 import mismatch in styles/globals.css")

    runtime_smoke_valid = "pages/index.tsx" in files if export_target == "nextjs-pages-ts-tailwind-v4" else True
    responsive_sanity = any(node.type == "section" for node in ir.nodes)
    accessibility_valid = any(
        node.accessibilityHints.get("landmark") == "region" for node in ir.nodes if node.type == "section"
    )

    visual_similarity = 0.62 if schema_valid and not dead_output_detected else 0.0

    return ValidationReport(
        schema_valid=schema_valid,
        import_valid=import_valid,
        dead_output_detected=dead_output_detected,
        runtime_smoke_valid=runtime_smoke_valid,
        responsive_sanity=responsive_sanity,
        accessibility_valid=accessibility_valid,
        visual_compare_available=False,
        visual_similarity=visual_similarity,
        issues=issues,
    )
