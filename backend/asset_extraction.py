import asyncio
import base64
import io
import json
import math
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, Dict, List, Sequence, cast

import pillow_heif
from google import genai
from google.genai import types
from PIL import Image, ImageOps
from pydantic import BaseModel, Field, ValidationError


ASSET_EXTRACTION_GEMINI_MODEL = "gemini-3.6-flash"
MAX_ASSETS_PER_GEMINI_REQUEST = 25
DEFAULT_ASSET_MEDIA_RESOLUTION = (
    types.PartMediaResolutionLevel.MEDIA_RESOLUTION_ULTRA_HIGH
)
SUPPORTED_GEMINI_IMAGE_MIME_TYPES = frozenset(
    {
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/heic",
        "image/heif",
    }
)

# Gemini accepts HEIC/HEIF, but Pillow needs its libheif-backed plugin to decode
# those pixels before EXIF normalization and cropping. pillow-heif's public
# function currently lacks a complete type annotation, so narrow it here.
_register_heif_opener = cast(Callable[[], None], pillow_heif.register_heif_opener)
_register_heif_opener()


class AssetDetection(BaseModel):
    """One schema-constrained answer, correlated by our stable request ID."""

    request_id: str = Field(
        description="The unchanged request_id from the corresponding input request."
    )
    image_index: int | None = Field(
        description=(
            "1-based source image number containing the requested asset, or null when "
            "the exact asset is absent, ambiguous, or cannot be isolated."
        )
    )
    box_2d: list[float] | None = Field(
        description=(
            "Tight [ymin, xmin, ymax, xmax] bounds normalized to 0-1000, or null "
            "when image_index is null."
        ),
        min_length=4,
        max_length=4,
    )
    label: str | None = Field(
        description=(
            "A short label that distinguishes this occurrence from lookalikes, or "
            "null when the asset was not found."
        )
    )


class AssetDetectionBatch(BaseModel):
    detections: list[AssetDetection] = Field(
        description="Exactly one detection for every requested request_id.",
        max_length=MAX_ASSETS_PER_GEMINI_REQUEST,
    )


@dataclass(frozen=True)
class SourceImage:
    part: types.Part
    image: Image.Image
    mime_type: str
    image_index: int


@dataclass(frozen=True)
class AssetRequest:
    request_id: str
    description: str


def _empty_float_list() -> list[float]:
    return []


def _empty_string_list() -> list[str]:
    return []


@dataclass
class AssetExtractionMetrics:
    """Optional request telemetry used by the opt-in live benchmark."""

    request_count: int = 0
    prompt_token_count: int = 0
    candidate_token_count: int = 0
    thoughts_token_count: int = 0
    total_token_count: int = 0
    request_latencies_seconds: list[float] = field(
        default_factory=_empty_float_list
    )
    response_ids: list[str] = field(default_factory=_empty_string_list)

    def record_response(
        self,
        response: types.GenerateContentResponse,
        latency_seconds: float,
    ) -> None:
        self.request_latencies_seconds.append(latency_seconds)
        if response.response_id:
            self.response_ids.append(response.response_id)

        usage = response.usage_metadata
        if usage is None:
            return
        self.prompt_token_count += usage.prompt_token_count or 0
        self.candidate_token_count += usage.candidates_token_count or 0
        self.thoughts_token_count += usage.thoughts_token_count or 0
        self.total_token_count += usage.total_token_count or 0


ASSET_DETECTION_SYSTEM_INSTRUCTION = """You are a precise 2D object detector for screenshot asset extraction.
Return only one schema-valid JSON object. Never return masks, segmentation, markdown fences, prose, or invented detections. Process no more than 25 requested objects per response.
"""


def _normalize_image_for_detection(image: Image.Image) -> Image.Image:
    """Apply EXIF orientation once and produce stable PNG-compatible pixels."""

    oriented = ImageOps.exif_transpose(image)
    has_alpha = "A" in oriented.getbands() or "transparency" in oriented.info
    normalized = oriented.convert("RGBA" if has_alpha else "RGB")
    normalized.load()
    return normalized


def _data_url_to_source_image(
    data_url: str,
    *,
    image_index: int = 1,
    media_resolution: types.PartMediaResolutionLevel = DEFAULT_ASSET_MEDIA_RESOLUTION,
) -> SourceImage | None:
    if not data_url.startswith("data:image/") or "," not in data_url:
        return None

    header, encoded = data_url.split(",", 1)
    mime_type = header.removeprefix("data:").split(";", 1)[0].lower()
    if mime_type not in SUPPORTED_GEMINI_IMAGE_MIME_TYPES:
        return None

    try:
        image_bytes = base64.b64decode(encoded, validate=True)
        with Image.open(io.BytesIO(image_bytes)) as opened_image:
            opened_image.seek(0)
            normalized_image = _normalize_image_for_detection(opened_image)
    except Exception:
        return None

    # Gemini must see the exact same oriented pixel matrix that we later crop.
    # Canonical PNG also prevents a misleading/unsupported data-URL MIME header
    # from putting model coordinates in a different orientation than Pillow.
    normalized_output = io.BytesIO()
    normalized_image.save(normalized_output, format="PNG")
    normalized_bytes = normalized_output.getvalue()
    normalized_mime_type = "image/png"

    return SourceImage(
        part=types.Part.from_bytes(
            data=normalized_bytes,
            mime_type=normalized_mime_type,
            media_resolution=media_resolution,
        ),
        image=normalized_image,
        mime_type=normalized_mime_type,
        image_index=image_index,
    )


def _stable_request_id(original_index: int) -> str:
    return f"asset-{original_index + 1:04d}"


def _chunk_requests(
    requests: Sequence[AssetRequest],
) -> list[list[AssetRequest]]:
    return [
        list(requests[start : start + MAX_ASSETS_PER_GEMINI_REQUEST])
        for start in range(0, len(requests), MAX_ASSETS_PER_GEMINI_REQUEST)
    ]


def _build_detection_prompt(
    source_images: Sequence[SourceImage],
    requests: Sequence[AssetRequest],
) -> str:
    source_mapping = "\n".join(
        f"- attached image {attachment_index} = source image {source.image_index} "
        f"({source.image.width}x{source.image.height} pixels after EXIF normalization)"
        for attachment_index, source in enumerate(source_images, start=1)
    )
    request_json = json.dumps(
        [
            {
                "request_id": request.request_id,
                "description": request.description,
            }
            for request in requests
        ],
        ensure_ascii=False,
        indent=2,
    )

    return f"""Locate each requested visual asset in the attached source images.

SOURCE IMAGE MAPPING (image_index must use the 1-based source image number):
{source_mapping}

REQUESTS:
{request_json}

BOUNDING-BOX RULES:
- Return exactly one detections record per request, retaining each request_id unchanged. Requests are independent and output order is not used for matching.
- box_2d is [ymin, xmin, ymax, xmax], relative to the selected source image and normalized to the documented 0-1000 range.
- Return the smallest axis-aligned box that contains the whole visible requested asset. Include every visible edge/pixel of the asset; do not clip it.
- Exclude surrounding UI: cards, containers, page backgrounds, padding, borders, nearby text, captions, controls, and unrelated shadows. Include one of those only when the description explicitly makes it part of the target.
- For a photo or illustration, bound the visible media itself, not its card or caption. For a logo/wordmark, include the complete logo only. For a small icon, include the glyph, not its button/container/badge unless requested.
- Repeated lookalikes are separate instances. Use the description's appearance, location, nearby context, and source image number to choose the one exact occurrence; do not reuse or merge boxes. Give labels distinguishing duplicate instances.
- If the described occurrence is absent, not uniquely distinguishable, substantially occluded, or cannot be isolated from unrelated UI, return that request_id with image_index=null, box_2d=null, and label=null. Never guess a box, substitute a lookalike, or return the whole screenshot.
- Return JSON only through the supplied schema. Never return masks, polygons, code fences, or explanatory text.
"""


def _parse_detection_response(
    response: types.GenerateContentResponse,
) -> AssetDetectionBatch:
    parsed = response.parsed
    try:
        if isinstance(parsed, AssetDetectionBatch):
            return parsed
        if parsed is not None:
            return AssetDetectionBatch.model_validate(parsed)
        if response.text:
            return AssetDetectionBatch.model_validate_json(response.text)
    except (ValidationError, TypeError, ValueError):
        pass
    return AssetDetectionBatch(detections=[])


async def _locate_asset_batch(
    client: genai.Client,
    source_images: Sequence[SourceImage],
    requests: Sequence[AssetRequest],
    metrics: AssetExtractionMetrics | None = None,
) -> AssetDetectionBatch:
    prompt = _build_detection_prompt(source_images, requests)
    if metrics is not None:
        metrics.request_count += 1
    started_at = time.perf_counter()
    response = await client.aio.models.generate_content(
        model=ASSET_EXTRACTION_GEMINI_MODEL,
        contents=[
            types.Content(
                role="user",
                # Keep the task prompt after all image parts, as recommended for
                # image understanding. The prompt maps attachment order back to
                # the caller's original 1-based source image numbers.
                parts=[source.part for source in source_images]
                + [types.Part(text=prompt)],
            )
        ],
        config=types.GenerateContentConfig(
            system_instruction=ASSET_DETECTION_SYSTEM_INSTRUCTION,
            temperature=0.5,
            response_mime_type="application/json",
            response_schema=AssetDetectionBatch,
            thinking_config=types.ThinkingConfig(
                thinking_level=types.ThinkingLevel.MINIMAL
            ),
        ),
    )
    if metrics is not None:
        metrics.record_response(response, time.perf_counter() - started_at)
    return _parse_detection_response(response)


def _normalize_box(value: object) -> list[float] | None:
    if not isinstance(value, list) or len(value) != 4:
        return None

    coordinates: list[float] = []
    for coordinate in cast(list[object], value):
        if isinstance(coordinate, bool) or not isinstance(coordinate, (int, float)):
            return None
        number = float(coordinate)
        if not math.isfinite(number):
            return None
        coordinates.append(number)

    raw_ymin, raw_xmin, raw_ymax, raw_xmax = coordinates
    ymin, ymax = sorted((raw_ymin, raw_ymax))
    xmin, xmax = sorted((raw_xmin, raw_xmax))
    ymin = max(0.0, min(1000.0, ymin))
    xmin = max(0.0, min(1000.0, xmin))
    ymax = max(0.0, min(1000.0, ymax))
    xmax = max(0.0, min(1000.0, xmax))

    if ymax <= ymin or xmax <= xmin:
        return None
    return [ymin, xmin, ymax, xmax]


def _crop_box_to_data_url(image: Image.Image, box_2d: list[float]) -> str | None:
    normalized_box = _normalize_box(box_2d)
    if normalized_box is None:
        return None

    width, height = image.size
    ymin, xmin, ymax, xmax = normalized_box
    # Outward rounding preserves every edge pixel instead of truncating the
    # model's bottom/right bounds and accidentally shaving a one-pixel border.
    left = max(0, min(width, math.floor(xmin / 1000 * width)))
    top = max(0, min(height, math.floor(ymin / 1000 * height)))
    right = max(0, min(width, math.ceil(xmax / 1000 * width)))
    bottom = max(0, min(height, math.ceil(ymax / 1000 * height)))

    if right <= left or bottom <= top:
        return None

    cropped = image.crop((left, top, right, bottom))
    if cropped.width <= 0 or cropped.height <= 0:
        return None

    output = io.BytesIO()
    cropped.save(output, format="PNG")
    encoded = base64.b64encode(output.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


async def extract_assets_from_images(
    image_data_urls: List[str],
    asset_descriptions: List[str],
    gemini_api_key: str,
    *,
    media_resolution: types.PartMediaResolutionLevel = DEFAULT_ASSET_MEDIA_RESOLUTION,
    metrics: AssetExtractionMetrics | None = None,
) -> Dict[str, Any]:
    source_images: list[SourceImage] = []
    for image_index, data_url in enumerate(image_data_urls, start=1):
        source = _data_url_to_source_image(
            data_url,
            image_index=image_index,
            media_resolution=media_resolution,
        )
        if source is not None:
            source_images.append(source)

    if not source_images:
        return {
            "assets": [],
            "error": "No valid input images were available for asset extraction.",
        }

    requests = [
        AssetRequest(
            request_id=_stable_request_id(original_index),
            description=description,
        )
        for original_index, description in enumerate(asset_descriptions)
    ]
    if not requests:
        return {"assets": []}

    # Per-part media resolution is a Gemini 3 v1alpha feature. Batches are
    # independent, so requests above the Cookbook's 25-object cap can run in
    # parallel while still being mapped deterministically by stable IDs.
    client = genai.Client(
        api_key=gemini_api_key,
        http_options=types.HttpOptions(api_version="v1alpha"),
    )
    request_chunks = _chunk_requests(requests)
    batch_results = await asyncio.gather(
        *(
            _locate_asset_batch(client, source_images, chunk, metrics)
            for chunk in request_chunks
        )
    )

    detections_by_request_id: dict[str, AssetDetection] = {}
    for request_chunk, batch in zip(request_chunks, batch_results):
        expected_ids = {request.request_id for request in request_chunk}
        for detection in batch.detections:
            if (
                detection.request_id in expected_ids
                and detection.request_id not in detections_by_request_id
            ):
                detections_by_request_id[detection.request_id] = detection

    source_by_image_index = {
        source.image_index: source for source in source_images
    }
    assets: List[Dict[str, Any]] = []
    for request in requests:
        detection = detections_by_request_id.get(request.request_id)
        image_index = detection.image_index if detection is not None else None
        if isinstance(image_index, bool):
            image_index = None
        box = _normalize_box(detection.box_2d) if detection is not None else None
        label = detection.label if detection is not None else None

        data_url = None
        status = "missing"
        if isinstance(image_index, int) and box is not None:
            source = source_by_image_index.get(image_index)
            if source is not None:
                data_url = _crop_box_to_data_url(source.image, box)
                status = "ok" if data_url else "error"

        assets.append(
            {
                "description": request.description,
                "data_url": data_url,
                "status": status,
                "box_2d": box,
                "image_index": image_index,
                "label": label,
            }
        )

    result: Dict[str, Any] = {"assets": assets}
    if any(asset["status"] != "ok" for asset in assets):
        result["error"] = (
            "Gemini did not return usable bounding boxes for every requested asset."
        )

    return result
