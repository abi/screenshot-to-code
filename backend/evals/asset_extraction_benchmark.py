"""Opt-in live benchmark for the Gemini asset-extraction pipeline.

Run from ``backend`` so no API traffic happens accidentally::

    poetry run python -m evals.asset_extraction_benchmark --live

The report compares the pre-batching settings (one request per asset,
ULTRA_HIGH, temperature 0, free-form JSON) with the new batched structured
pipeline at HIGH and ULTRA_HIGH. It writes JSON, an HTML summary, crops, and
box overlays under ``evals_data/asset_extraction_benchmark``.
"""

import argparse
import asyncio
import base64
import html
import io
import json
import os
import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, cast

from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image, ImageDraw, ImageFont

from asset_extraction import (
    ASSET_EXTRACTION_GEMINI_MODEL,
    AssetExtractionMetrics,
    SourceImage,
    _crop_box_to_data_url,
    _data_url_to_source_image,
    _normalize_box,
    extract_assets_from_images,
)


DEFAULT_OUTPUT_ROOT = Path("evals_data/asset_extraction_benchmark")
DEFAULT_IOU_THRESHOLD = 0.5


@dataclass(frozen=True)
class BenchmarkTarget:
    target_id: str
    category: str
    description: str
    image_index: int | None
    expected_box_2d: list[float] | None


@dataclass(frozen=True)
class BenchmarkFixture:
    image_data_urls: list[str]
    image_paths: list[Path]
    image_sizes: list[tuple[int, int]]
    targets: list[BenchmarkTarget]


def _font(size: int, *, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    filename = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    path = Path("/usr/share/fonts/truetype/dejavu") / filename
    try:
        return ImageFont.truetype(str(path), size=size)
    except OSError:
        return ImageFont.load_default()


def _to_data_url(image: Image.Image) -> str:
    output = io.BytesIO()
    image.save(output, format="PNG")
    encoded = base64.b64encode(output.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def _normalized_box(
    pixel_box: tuple[int, int, int, int], image_size: tuple[int, int]
) -> list[float]:
    left, top, right, bottom = pixel_box
    width, height = image_size
    return [
        top / height * 1000,
        left / width * 1000,
        bottom / height * 1000,
        right / width * 1000,
    ]


def _draw_star(
    draw: ImageDraw.ImageDraw,
    center: tuple[int, int],
    radius: int,
    fill: str,
) -> tuple[int, int, int, int]:
    cx, cy = center
    points = [
        (cx, cy - radius),
        (cx + radius // 3, cy - radius // 3),
        (cx + radius, cy),
        (cx + radius // 3, cy + radius // 3),
        (cx, cy + radius),
        (cx - radius // 3, cy + radius // 3),
        (cx - radius, cy),
        (cx - radius // 3, cy - radius // 3),
    ]
    draw.polygon(points, fill=fill)
    return (cx - radius, cy - radius, cx + radius + 1, cy + radius + 1)


def _build_first_screenshot() -> tuple[Image.Image, dict[str, tuple[int, int, int, int]]]:
    size = (1200, 800)
    image = Image.new("RGB", size, "#f4f6fb")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 1200, 124), fill="white")
    draw.line((0, 123, 1200, 123), fill="#dfe3ed", width=2)

    # Logo/wordmark: a distinct visual target within a much larger navbar.
    logo_mark = (48, 34, 108, 94)
    draw.rounded_rectangle(logo_mark, radius=15, fill="#6d4aff")
    draw.polygon([(63, 64), (78, 47), (94, 64), (78, 81)], fill="white")
    logo_font = _font(42, bold=True)
    logo_text_xy = (122, 38)
    draw.text(logo_text_xy, "LUMA", font=logo_font, fill="#161a2b")
    text_box = draw.textbbox(logo_text_xy, "LUMA", font=logo_font)
    logo_box = (
        logo_mark[0],
        min(logo_mark[1], text_box[1]),
        text_box[2],
        max(logo_mark[3], text_box[3]),
    )

    # Small magnifier glyph inside a button; expected bounds exclude the button.
    draw.ellipse((1070, 30, 1142, 102), fill="#f1f3f8", outline="#d8dce7", width=2)
    draw.ellipse((1091, 49, 1118, 76), outline="#252a3d", width=5)
    draw.line((1114, 72, 1130, 88), fill="#252a3d", width=5)
    small_icon_box = (1088, 46, 1134, 92)

    # Illustration inside a surrounding card, with unrelated title/copy beneath.
    draw.rounded_rectangle((42, 145, 758, 720), radius=28, fill="white")
    illustration_box = (76, 178, 724, 560)
    left, top, right, bottom = illustration_box
    for y in range(top, bottom):
        ratio = (y - top) / (bottom - top)
        color = (
            int(80 + 120 * ratio),
            int(120 + 80 * ratio),
            int(235 - 45 * ratio),
        )
        draw.line((left, y, right, y), fill=color)
    draw.ellipse((535, 220, 625, 310), fill="#ffd66b")
    draw.polygon(
        [(76, 500), (245, 320), (392, 500), (525, 355), (724, 520), (724, 560), (76, 560)],
        fill="#273b78",
    )
    draw.polygon(
        [(76, 520), (290, 405), (430, 520), (620, 415), (724, 505), (724, 560), (76, 560)],
        fill="#5a78bb",
    )
    draw.text((76, 594), "Explore beyond the ordinary", font=_font(28, bold=True), fill="#171b2c")
    draw.text((76, 638), "Curated stories and field notes", font=_font(20), fill="#687086")

    # Two intentionally identical assets, differentiated only by location/context.
    for card_box, label in [((800, 185, 950, 355), "Primary"), ((980, 185, 1130, 355), "Backup")]:
        draw.rounded_rectangle(card_box, radius=22, fill="white", outline="#e4e7ef", width=2)
        draw.text((card_box[0] + 34, 310), label, font=_font(18), fill="#61687b")
    left_duplicate_box = _draw_star(draw, (875, 255), 34, "#11a8a1")
    right_duplicate_box = _draw_star(draw, (1055, 255), 34, "#11a8a1")

    return image, {
        "logo": logo_box,
        "illustration": illustration_box,
        "small_icon": small_icon_box,
        "duplicate_left": left_duplicate_box,
        "duplicate_right": right_duplicate_box,
    }


def _build_second_screenshot() -> tuple[Image.Image, dict[str, tuple[int, int, int, int]]]:
    size = (1000, 700)
    image = Image.new("RGB", size, "#eef1f5")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 1000, 96), fill="#17223a")
    draw.text((38, 27), "TRAVEL NOTES", font=_font(28, bold=True), fill="white")
    draw.rounded_rectangle((72, 120, 928, 650), radius=30, fill="white")

    photo_box = (108, 154, 892, 520)
    left, top, right, bottom = photo_box
    for y in range(top, bottom):
        ratio = (y - top) / (bottom - top)
        color = (
            int(245 - 75 * ratio),
            int(190 - 55 * ratio),
            int(150 + 65 * ratio),
        )
        draw.line((left, y, right, y), fill=color)
    draw.ellipse((685, 202, 765, 282), fill="#fff0a6")
    draw.polygon([(108, 470), (290, 270), (470, 470)], fill="#34465c")
    draw.polygon([(330, 500), (585, 240), (835, 500)], fill="#536b7f")
    draw.polygon([(108, 475), (300, 380), (510, 500), (720, 365), (892, 485), (892, 520), (108, 520)], fill="#1c6670")
    draw.text((108, 557), "Dawn over the northern ridge", font=_font(28, bold=True), fill="#17223a")
    draw.text((108, 600), "Field journal · Day 14", font=_font(19), fill="#6b7383")

    return image, {"second_source_photo": photo_box}


def build_fixture(output_dir: Path) -> BenchmarkFixture:
    output_dir.mkdir(parents=True, exist_ok=True)
    first, first_boxes = _build_first_screenshot()
    second, second_boxes = _build_second_screenshot()
    images = [first, second]
    paths: list[Path] = []
    for index, image in enumerate(images, start=1):
        path = output_dir / f"fixture_source_{index}.png"
        image.save(path, format="PNG")
        paths.append(path)

    targets = [
        BenchmarkTarget(
            target_id="logo",
            category="logo",
            description=(
                "Complete purple diamond mark plus LUMA wordmark at the far left "
                "of the white top navigation in screenshot 1; exclude the navbar."
            ),
            image_index=1,
            expected_box_2d=_normalized_box(first_boxes["logo"], first.size),
        ),
        BenchmarkTarget(
            target_id="illustration",
            category="photo_or_illustration",
            description=(
                "Rectangular blue mountain-and-sun illustration in the large left "
                "card of screenshot 1; exclude its white card and text below."
            ),
            image_index=1,
            expected_box_2d=_normalized_box(first_boxes["illustration"], first.size),
        ),
        BenchmarkTarget(
            target_id="small_icon",
            category="small_icon",
            description=(
                "Small dark magnifying-glass glyph inside the pale circular control "
                "at the top-right of screenshot 1; extract the glyph only."
            ),
            image_index=1,
            expected_box_2d=_normalized_box(first_boxes["small_icon"], first.size),
        ),
        BenchmarkTarget(
            target_id="duplicate_left",
            category="duplicate_instance",
            description=(
                "Left teal four-point sparkle icon in the card labeled Primary on "
                "the right side of screenshot 1; icon only, not its card or label."
            ),
            image_index=1,
            expected_box_2d=_normalized_box(first_boxes["duplicate_left"], first.size),
        ),
        BenchmarkTarget(
            target_id="duplicate_right",
            category="duplicate_instance",
            description=(
                "Right teal four-point sparkle icon in the card labeled Backup on "
                "the right side of screenshot 1; icon only, not its card or label."
            ),
            image_index=1,
            expected_box_2d=_normalized_box(first_boxes["duplicate_right"], first.size),
        ),
        BenchmarkTarget(
            target_id="second_source_photo",
            category="multiple_source_images",
            description=(
                "Wide sunrise mountain photo in the central white article card of "
                "screenshot 2; exclude the card, header, and caption below."
            ),
            image_index=2,
            expected_box_2d=_normalized_box(
                second_boxes["second_source_photo"], second.size
            ),
        ),
        BenchmarkTarget(
            target_id="absent",
            category="absent_target",
            description=(
                "Orange rocket icon next to a Launch button in screenshot 2; this "
                "exact asset may be absent, so do not substitute another icon."
            ),
            image_index=None,
            expected_box_2d=None,
        ),
    ]

    return BenchmarkFixture(
        image_data_urls=[_to_data_url(image) for image in images],
        image_paths=paths,
        image_sizes=[image.size for image in images],
        targets=targets,
    )


def box_iou(first: list[float], second: list[float]) -> float:
    first_ymin, first_xmin, first_ymax, first_xmax = first
    second_ymin, second_xmin, second_ymax, second_xmax = second
    intersection_width = max(0.0, min(first_xmax, second_xmax) - max(first_xmin, second_xmin))
    intersection_height = max(0.0, min(first_ymax, second_ymax) - max(first_ymin, second_ymin))
    intersection = intersection_width * intersection_height
    first_area = max(0.0, first_xmax - first_xmin) * max(0.0, first_ymax - first_ymin)
    second_area = max(0.0, second_xmax - second_xmin) * max(0.0, second_ymax - second_ymin)
    union = first_area + second_area - intersection
    return intersection / union if union > 0 else 0.0


def _legacy_json_object(text: str) -> dict[str, Any] | None:
    """Reproduce the pre-change free-form/regex parser only for comparison."""

    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```(?:json)?\s*", "", stripped)
        stripped = re.sub(r"\s*```$", "", stripped)
    try:
        parsed: Any = json.loads(stripped)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", stripped, re.DOTALL)
        if match is None:
            return None
        try:
            parsed = json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
    return cast(dict[str, Any], parsed) if isinstance(parsed, dict) else None


def _legacy_prompt(source_images: list[SourceImage], description: str) -> str:
    image_list_text = "\n".join(
        f"- image_index {source.image_index}" for source in source_images
    )
    return f"""Find the bounding box for this visual asset:

{description}

Images available:
{image_list_text}

Return only JSON with this exact shape:
{{"image_index": 1, "box_2d": [y0, x0, y1, x1], "label": "short label"}}

Rules:
- image_index is 1-based and identifies which input image contains the asset.
- box_2d uses normalized coordinates from 0 to 1000.
- box_2d order must be [y0, x0, y1, x1].
- Crop tightly around the requested asset.
- If the asset is not visible, return {{"image_index": null, "box_2d": null, "label": "not found"}}.
- Return JSON only. No markdown.
"""


async def _run_legacy_profile(
    fixture: BenchmarkFixture,
    api_key: str,
) -> tuple[dict[str, Any], AssetExtractionMetrics, float]:
    source_images = [
        source
        for image_index, data_url in enumerate(fixture.image_data_urls, start=1)
        if (
            source := _data_url_to_source_image(
                data_url,
                image_index=image_index,
                media_resolution=(
                    types.PartMediaResolutionLevel.MEDIA_RESOLUTION_ULTRA_HIGH
                ),
            )
        )
        is not None
    ]
    client = genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(api_version="v1alpha"),
    )
    metrics = AssetExtractionMetrics()
    assets: list[dict[str, Any]] = []
    wall_started = time.perf_counter()

    for target in fixture.targets:
        prompt = _legacy_prompt(source_images, target.description)
        metrics.request_count += 1
        request_started = time.perf_counter()
        response = await client.aio.models.generate_content(
            model=ASSET_EXTRACTION_GEMINI_MODEL,
            contents=[
                types.Content(
                    role="user",
                    parts=[source.part for source in source_images]
                    + [types.Part(text=prompt)],
                )
            ],
            config=types.GenerateContentConfig(
                temperature=0,
                response_mime_type="application/json",
                thinking_config=types.ThinkingConfig(
                    thinking_level=types.ThinkingLevel.MINIMAL
                ),
            ),
        )
        metrics.record_response(response, time.perf_counter() - request_started)
        detection = _legacy_json_object(response.text or "")
        raw_image_index = detection.get("image_index") if detection else None
        image_index = (
            raw_image_index
            if isinstance(raw_image_index, int) and not isinstance(raw_image_index, bool)
            else None
        )
        box = _normalize_box(detection.get("box_2d")) if detection else None
        label = detection.get("label") if detection else None
        data_url = None
        status = "missing"
        if image_index is not None and box is not None:
            source = next(
                (
                    item
                    for item in source_images
                    if item.image_index == image_index
                ),
                None,
            )
            if source is not None:
                data_url = _crop_box_to_data_url(source.image, box)
                status = "ok" if data_url else "error"
        assets.append(
            {
                "description": target.description,
                "data_url": data_url,
                "status": status,
                "box_2d": box,
                "image_index": image_index,
                "label": label,
            }
        )

    return {"assets": assets}, metrics, time.perf_counter() - wall_started


async def _run_new_profile(
    fixture: BenchmarkFixture,
    api_key: str,
    media_resolution: types.PartMediaResolutionLevel,
) -> tuple[dict[str, Any], AssetExtractionMetrics, float]:
    metrics = AssetExtractionMetrics()
    wall_started = time.perf_counter()
    result = await extract_assets_from_images(
        image_data_urls=fixture.image_data_urls,
        asset_descriptions=[target.description for target in fixture.targets],
        gemini_api_key=api_key,
        media_resolution=media_resolution,
        metrics=metrics,
    )
    return result, metrics, time.perf_counter() - wall_started


def _decode_crop(data_url: str) -> Image.Image:
    _, encoded = data_url.split(",", 1)
    with Image.open(io.BytesIO(base64.b64decode(encoded))) as image:
        return image.copy()


def _evaluate_profile(
    *,
    name: str,
    settings: dict[str, Any],
    result: dict[str, Any],
    metrics: AssetExtractionMetrics,
    latency_seconds: float,
    fixture: BenchmarkFixture,
    output_dir: Path,
    iou_threshold: float,
) -> dict[str, Any]:
    raw_assets = result.get("assets")
    assets = cast(list[dict[str, Any]], raw_assets) if isinstance(raw_assets, list) else []
    target_results: list[dict[str, Any]] = []
    present_ious: list[float] = []
    success_count = 0

    crops_dir = output_dir / "crops"
    crops_dir.mkdir(exist_ok=True)
    for index, target in enumerate(fixture.targets):
        asset = assets[index] if index < len(assets) else {}
        status = str(asset.get("status") or "missing")
        predicted_index_raw = asset.get("image_index")
        predicted_index = (
            predicted_index_raw if isinstance(predicted_index_raw, int) else None
        )
        predicted_box = _normalize_box(asset.get("box_2d"))
        iou: float | None = None
        source_match = predicted_index == target.image_index

        if target.expected_box_2d is None:
            success = status == "missing" and predicted_box is None
        else:
            iou = (
                box_iou(target.expected_box_2d, predicted_box)
                if predicted_box is not None and source_match
                else 0.0
            )
            present_ious.append(iou)
            success = status == "ok" and source_match and iou >= iou_threshold
        success_count += int(success)

        crop_file = None
        data_url = asset.get("data_url")
        if isinstance(data_url, str) and data_url:
            crop_file = f"crops/{name}_{target.target_id}.png"
            _decode_crop(data_url).save(output_dir / crop_file, format="PNG")

        target_results.append(
            {
                "target_id": target.target_id,
                "category": target.category,
                "description": target.description,
                "expected_image_index": target.image_index,
                "predicted_image_index": predicted_index,
                "expected_box_2d": target.expected_box_2d,
                "predicted_box_2d": predicted_box,
                "status": status,
                "source_match": source_match,
                "box_iou": round(iou, 4) if iou is not None else None,
                "success": success,
                "crop_file": crop_file,
            }
        )

    profile: dict[str, Any] = {
        "name": name,
        "settings": settings,
        "latency_seconds": round(latency_seconds, 3),
        "request_count": metrics.request_count,
        "token_usage": {
            "prompt": metrics.prompt_token_count,
            "candidate": metrics.candidate_token_count,
            "thoughts": metrics.thoughts_token_count,
            "total": metrics.total_token_count,
        },
        "success_count": success_count,
        "target_count": len(fixture.targets),
        "success_rate": round(success_count / len(fixture.targets), 4),
        "mean_present_box_iou": round(
            sum(present_ious) / len(present_ious), 4
        )
        if present_ious
        else None,
        "targets": target_results,
    }
    _write_overlays(profile, fixture, output_dir)
    return profile


def _normalized_to_pixels(
    box: list[float], image_size: tuple[int, int]
) -> tuple[int, int, int, int]:
    ymin, xmin, ymax, xmax = box
    width, height = image_size
    return (
        round(xmin / 1000 * width),
        round(ymin / 1000 * height),
        round(xmax / 1000 * width),
        round(ymax / 1000 * height),
    )


def _write_overlays(
    profile: dict[str, Any], fixture: BenchmarkFixture, output_dir: Path
) -> None:
    targets = cast(list[dict[str, Any]], profile["targets"])
    for image_index, (source_path, image_size) in enumerate(
        zip(fixture.image_paths, fixture.image_sizes), start=1
    ):
        with Image.open(source_path) as source:
            overlay = source.convert("RGB")
        draw = ImageDraw.Draw(overlay)
        font = _font(15, bold=True)
        for target in targets:
            target_id = str(target["target_id"])
            if target["expected_image_index"] == image_index:
                expected = target["expected_box_2d"]
                if isinstance(expected, list):
                    box = _normalized_to_pixels(cast(list[float], expected), image_size)
                    draw.rectangle(box, outline="#16a36a", width=4)
                    draw.text((box[0] + 3, box[1] + 3), f"E {target_id}", font=font, fill="#087d4d")
            if target["predicted_image_index"] == image_index:
                predicted = target["predicted_box_2d"]
                if isinstance(predicted, list):
                    box = _normalized_to_pixels(cast(list[float], predicted), image_size)
                    draw.rectangle(box, outline="#e34b4b", width=3)
                    draw.text((box[0] + 3, max(0, box[1] - 19)), f"P {target_id}", font=font, fill="#b92727")
        filename = f"{profile['name']}_source_{image_index}_overlay.png"
        overlay.save(output_dir / filename, format="PNG")


def _metric(value: Any, digits: int = 3) -> str:
    if isinstance(value, float):
        return f"{value:.{digits}f}"
    return str(value)


def _write_html_report(manifest: dict[str, Any], output_dir: Path) -> Path:
    profiles = cast(list[dict[str, Any]], manifest["profiles"])
    metric_cards = "".join(
        f"""
        <article class="metric-card">
          <div class="profile-name">{html.escape(str(profile['name']))}</div>
          <div class="score">{profile['success_count']}/{profile['target_count']}</div>
          <div class="score-label">successful targets</div>
          <dl>
            <div><dt>Mean box IoU</dt><dd>{_metric(profile['mean_present_box_iou'])}</dd></div>
            <div><dt>Wall latency</dt><dd>{_metric(profile['latency_seconds'])}s</dd></div>
            <div><dt>Requests</dt><dd>{profile['request_count']}</dd></div>
            <div><dt>Total tokens</dt><dd>{profile['token_usage']['total']:,}</dd></div>
            <div><dt>Prompt tokens</dt><dd>{profile['token_usage']['prompt']:,}</dd></div>
          </dl>
        </article>
        """
        for profile in profiles
    )

    sections: list[str] = []
    for profile in profiles:
        rows = []
        for target in cast(list[dict[str, Any]], profile["targets"]):
            iou = "—" if target["box_iou"] is None else _metric(target["box_iou"], 3)
            crop = (
                f'<img class="crop" src="{html.escape(target["crop_file"])}" alt="crop">'
                if target["crop_file"]
                else '<span class="missing">none</span>'
            )
            outcome = "PASS" if target["success"] else "FAIL"
            rows.append(
                f"""
                <tr>
                  <td><strong>{html.escape(target['target_id'])}</strong><br><span>{html.escape(target['category'])}</span></td>
                  <td>{target['expected_image_index'] or 'absent'} → {target['predicted_image_index'] or 'missing'}</td>
                  <td>{iou}</td>
                  <td><span class="pill {'pass' if target['success'] else 'fail'}">{outcome}</span></td>
                  <td>{crop}</td>
                </tr>
                """
            )
        overlays = "".join(
            f"<img src=\"{profile['name']}_source_{index}_overlay.png\" alt=\"{profile['name']} source {index} overlay\">"
            for index in range(1, 3)
        )
        sections.append(
            f"""
            <section>
              <div class="section-heading">
                <div><p class="eyebrow">Profile</p><h2>{html.escape(profile['name'])}</h2></div>
                <code>{html.escape(json.dumps(profile['settings'], sort_keys=True))}</code>
              </div>
              <div class="overlays">{overlays}</div>
              <table>
                <thead><tr><th>Target</th><th>Source</th><th>IoU</th><th>Result</th><th>Crop</th></tr></thead>
                <tbody>{''.join(rows)}</tbody>
              </table>
            </section>
            """
        )

    document = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gemini asset extraction benchmark</title>
<style>
  :root {{ color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #172033; background: #eef1f7; }}
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; }}
  main {{ width: min(1320px, calc(100% - 48px)); margin: 36px auto 72px; }}
  header {{ background: linear-gradient(135deg, #171b32, #34246f); color: white; border-radius: 24px; padding: 34px 38px; box-shadow: 0 18px 45px #24265025; }}
  .eyebrow {{ margin: 0 0 7px; text-transform: uppercase; letter-spacing: .14em; font-size: 12px; font-weight: 800; color: #8f7cff; }}
  header .eyebrow {{ color: #bdb2ff; }}
  h1 {{ margin: 0; font-size: 38px; letter-spacing: -.035em; }}
  header p:last-child {{ margin: 12px 0 0; color: #d6d8e8; max-width: 850px; line-height: 1.55; }}
  .metrics {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin: 22px 0; }}
  .metric-card, section {{ background: white; border: 1px solid #dfe3ec; border-radius: 20px; box-shadow: 0 10px 30px #2f3c5910; }}
  .metric-card {{ padding: 24px; }}
  .profile-name {{ font: 700 13px ui-monospace, monospace; color: #6756c8; }}
  .score {{ font-size: 42px; font-weight: 800; letter-spacing: -.04em; margin-top: 12px; }}
  .score-label {{ color: #71798b; margin-top: -5px; }}
  dl {{ margin: 20px 0 0; }}
  dl div {{ display: flex; justify-content: space-between; border-top: 1px solid #eef0f5; padding: 9px 0; }}
  dt {{ color: #737b8d; }} dd {{ margin: 0; font-weight: 700; }}
  section {{ padding: 28px; margin-top: 22px; }}
  .section-heading {{ display: flex; justify-content: space-between; align-items: end; gap: 20px; margin-bottom: 20px; }}
  h2 {{ margin: 0; font-size: 28px; }}
  code {{ max-width: 68%; white-space: normal; color: #596175; background: #f4f5f8; padding: 10px 12px; border-radius: 10px; }}
  .overlays {{ display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; margin-bottom: 22px; align-items: start; }}
  .overlays img {{ width: 100%; border-radius: 13px; border: 1px solid #dfe3eb; }}
  table {{ width: 100%; border-collapse: collapse; }}
  th, td {{ text-align: left; border-top: 1px solid #e9ebf0; padding: 12px 10px; vertical-align: middle; }}
  th {{ color: #737b8d; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }}
  td span {{ color: #7b8292; font-size: 12px; }}
  .pill {{ display: inline-block; padding: 5px 8px; border-radius: 7px; font-weight: 800; font-size: 11px; }}
  .pill.pass {{ color: #087d4d; background: #dff7eb; }} .pill.fail {{ color: #ac2929; background: #fee6e6; }}
  .crop {{ width: 90px; max-height: 62px; object-fit: contain; background: #eef0f4; border-radius: 8px; border: 1px solid #dde1e9; }}
  .missing {{ color: #959cab; }}
  @media (max-width: 900px) {{ .metrics {{ grid-template-columns: 1fr; }} .overlays {{ grid-template-columns: 1fr; }} .section-heading {{ align-items: start; flex-direction: column; }} code {{ max-width: 100%; }} }}
</style>
</head>
<body><main>
<header>
  <p class="eyebrow">Live Gemini 3.6 Flash fixture · {html.escape(manifest['generated_at'])}</p>
  <h1>Asset extraction: old vs. batched + schema</h1>
  <p>Seven ordered targets across two synthetic screenshots: logo, illustration, small glyph, repeated lookalikes, second-source mapping, and a genuinely absent item. Green boxes are ground truth; red boxes are model predictions. Success requires the right source and IoU ≥ {manifest['iou_threshold']} (or a missing result for the absent target).</p>
</header>
<div class="metrics">{metric_cards}</div>
{''.join(sections)}
</main></body></html>"""
    report_path = output_dir / "report.html"
    report_path.write_text(document)
    return report_path


def _profile_settings(name: str) -> dict[str, Any]:
    if name == "old_ultra_high":
        return {
            "batch_size": 1,
            "response_schema": False,
            "temperature": 0,
            "thinking": "minimal",
            "media_resolution": "ULTRA_HIGH (2240 image tokens/image)",
        }
    resolution = "HIGH" if name == "new_high" else "ULTRA_HIGH"
    image_tokens = 1120 if resolution == "HIGH" else 2240
    return {
        "batch_size": 25,
        "response_schema": True,
        "temperature": 0.5,
        "thinking": "minimal",
        "media_resolution": f"{resolution} ({image_tokens} image tokens/image)",
    }


async def run_benchmark(
    *,
    api_key: str,
    output_dir: Path,
    iou_threshold: float = DEFAULT_IOU_THRESHOLD,
) -> Path:
    fixture = build_fixture(output_dir)
    profile_runs: list[
        tuple[
            str,
            tuple[dict[str, Any], AssetExtractionMetrics, float],
        ]
    ] = []

    print("running old_ultra_high (one request per target)...", flush=True)
    profile_runs.append(
        ("old_ultra_high", await _run_legacy_profile(fixture, api_key))
    )
    print("running new_high (one batched structured request)...", flush=True)
    profile_runs.append(
        (
            "new_high",
            await _run_new_profile(
                fixture,
                api_key,
                types.PartMediaResolutionLevel.MEDIA_RESOLUTION_HIGH,
            ),
        )
    )
    print("running new_ultra_high (resolution sensitivity)...", flush=True)
    profile_runs.append(
        (
            "new_ultra_high",
            await _run_new_profile(
                fixture,
                api_key,
                types.PartMediaResolutionLevel.MEDIA_RESOLUTION_ULTRA_HIGH,
            ),
        )
    )

    profiles = [
        _evaluate_profile(
            name=name,
            settings=_profile_settings(name),
            result=run_result[0],
            metrics=run_result[1],
            latency_seconds=run_result[2],
            fixture=fixture,
            output_dir=output_dir,
            iou_threshold=iou_threshold,
        )
        for name, run_result in profile_runs
    ]
    manifest: dict[str, Any] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model": ASSET_EXTRACTION_GEMINI_MODEL,
        "iou_threshold": iou_threshold,
        "fixture": {
            "source_count": len(fixture.image_data_urls),
            "target_count": len(fixture.targets),
            "categories": sorted({target.category for target in fixture.targets}),
        },
        "profiles": profiles,
    }
    (output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))
    report_path = _write_html_report(manifest, output_dir)

    print("\nprofile\tsuccess\tmean_iou\tlatency_s\trequests\ttotal_tokens")
    for profile in profiles:
        print(
            f"{profile['name']}\t{profile['success_count']}/{profile['target_count']}\t"
            f"{profile['mean_present_box_iou']}\t{profile['latency_seconds']}\t"
            f"{profile['request_count']}\t{profile['token_usage']['total']}"
        )
    print(f"manifest={output_dir / 'manifest.json'}")
    print(f"report={report_path}")
    return report_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the opt-in live Gemini asset-extraction fixture benchmark."
    )
    parser.add_argument(
        "--live",
        action="store_true",
        help="Required acknowledgement that this command makes paid Gemini API calls.",
    )
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument(
        "--iou-threshold",
        type=float,
        default=DEFAULT_IOU_THRESHOLD,
    )
    return parser.parse_args()


async def main() -> None:
    load_dotenv(Path(".env"))
    args = parse_args()
    if not args.live:
        raise SystemExit(
            "Live API calls are disabled by default. Re-run with --live to opt in."
        )
    if not 0 <= args.iou_threshold <= 1:
        raise SystemExit("--iou-threshold must be between 0 and 1")
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise SystemExit("Missing GEMINI_API_KEY")
    output_dir = args.output_dir or (
        DEFAULT_OUTPUT_ROOT / time.strftime("%Y%m%d_%H%M%S")
    )
    await run_benchmark(
        api_key=api_key,
        output_dir=output_dir,
        iou_threshold=args.iou_threshold,
    )


if __name__ == "__main__":
    asyncio.run(main())
