from __future__ import annotations

import base64
import io
from dataclasses import dataclass
from typing import Any

from PIL import Image

from product_engine.schemas import Bounds, SourceRegion


@dataclass
class AnalysisOutput:
    ocr: dict[str, Any]
    regions: list[SourceRegion]
    image_stats: list[dict[str, Any]]


def _parse_data_url(data_url: str) -> bytes:
    if "," not in data_url:
        raise ValueError("Invalid data URL")
    _, payload = data_url.split(",", 1)
    return base64.b64decode(payload)


def _classify_breakpoint(width: int) -> str:
    if width <= 640:
        return "mobile"
    if width <= 1024:
        return "tablet"
    return "desktop"


def analyze_inputs(screenshot_data_urls: list[str], screenshot_notes: str | None) -> AnalysisOutput:
    regions: list[SourceRegion] = []
    image_stats: list[dict[str, Any]] = []
    reconstructed_text = screenshot_notes.strip() if screenshot_notes else ""

    for idx, data_url in enumerate(screenshot_data_urls):
        image_bytes = _parse_data_url(data_url)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        width, height = image.size
        screenshot_id = f"shot-{idx}"
        image_stats.append(
            {
                "id": screenshot_id,
                "width": width,
                "height": height,
                "breakpoint": _classify_breakpoint(width),
                "dominant_color": "#%02x%02x%02x" % image.resize((1, 1)).getpixel((0, 0)),
            }
        )

        thirds = [0, height // 3, (height // 3) * 2, height]
        for section_idx in range(3):
            y_start = thirds[section_idx]
            y_end = thirds[section_idx + 1]
            regions.append(
                SourceRegion(
                    id=f"{screenshot_id}-section-{section_idx}",
                    screenshot_id=screenshot_id,
                    bounds=Bounds(x=0, y=y_start, width=width, height=max(1, y_end - y_start)),
                    confidence=0.55,
                    region_type="section",
                )
            )

    ocr: dict[str, Any] = {
        "text_blocks": (
            [
                {
                    "id": "notes-0",
                    "text": reconstructed_text,
                    "confidence": 0.4 if reconstructed_text else 0.0,
                }
            ]
            if reconstructed_text
            else []
        ),
        "warnings": [
            "OCR provider not configured; used screenshot_notes as fallback text source."
        ]
        if reconstructed_text
        else ["OCR provider not configured; continuing with structural-only analysis."],
    }

    return AnalysisOutput(ocr=ocr, regions=regions, image_stats=image_stats)
