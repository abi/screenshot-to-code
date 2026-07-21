import base64
import io
import json
import re
from dataclasses import dataclass
from typing import Any, Dict, List, cast

from google import genai
from google.genai import types
from PIL import Image


ASSET_EXTRACTION_GEMINI_MODEL = "gemini-3.6-flash"


@dataclass(frozen=True)
class SourceImage:
    part: types.Part
    image: Image.Image
    mime_type: str


def _data_url_to_source_image(data_url: str) -> SourceImage | None:
    if not data_url.startswith("data:image/") or "," not in data_url:
        return None

    header, encoded = data_url.split(",", 1)
    mime_type = header.removeprefix("data:").split(";", 1)[0].lower()
    try:
        image_bytes = base64.b64decode(encoded, validate=True)
        image = Image.open(io.BytesIO(image_bytes))
        image.load()
    except Exception:
        return None

    return SourceImage(
        part=types.Part.from_bytes(
            data=image_bytes,
            mime_type=mime_type,
            media_resolution=types.PartMediaResolutionLevel.MEDIA_RESOLUTION_ULTRA_HIGH,
        ),
        image=image,
        mime_type=mime_type,
    )


def _extract_json_object(text: str) -> Dict[str, Any] | None:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```(?:json)?\s*", "", stripped)
        stripped = re.sub(r"\s*```$", "", stripped)

    try:
        parsed: Any = json.loads(stripped)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", stripped, re.DOTALL)
        if not match:
            return None
        try:
            parsed = json.loads(match.group(0))
        except json.JSONDecodeError:
            return None

    if not isinstance(parsed, dict):
        return None
    return cast(Dict[str, Any], parsed)


def _coerce_box(value: Any) -> list[int] | None:
    if not isinstance(value, list) or len(value) != 4:
        return None

    box: list[int] = []
    for coordinate in cast(list[object], value):
        if not isinstance(coordinate, (int, float, str)):
            return None
        try:
            box.append(int(round(float(coordinate))))
        except (TypeError, ValueError):
            return None
    return box


def _crop_box_to_data_url(image: Image.Image, box_2d: list[int]) -> str | None:
    width, height = image.size
    y0, x0, y1, x1 = [max(0, min(1000, value)) for value in box_2d]

    left = int(x0 / 1000 * width)
    top = int(y0 / 1000 * height)
    right = int(x1 / 1000 * width)
    bottom = int(y1 / 1000 * height)

    if right <= left or bottom <= top:
        return None

    cropped = image.crop((left, top, right, bottom))
    output = io.BytesIO()
    cropped.save(output, format="PNG")
    encoded = base64.b64encode(output.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


async def _locate_asset_box(
    client: genai.Client,
    source_images: List[SourceImage],
    description: str,
) -> Dict[str, Any] | None:
    image_list_text = "\n".join(
        f"- image_index {index}" for index in range(1, len(source_images) + 1)
    )
    prompt = f"""Find the bounding box for this visual asset:

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

    response = await client.aio.models.generate_content(
        model=ASSET_EXTRACTION_GEMINI_MODEL,
        contents=[
            types.Content(
                role="user",
                parts=[source.part for source in source_images] + [types.Part(text=prompt)],
            )
        ],
        config=types.GenerateContentConfig(
            temperature=0,
            response_mime_type="application/json",
            thinking_config=types.ThinkingConfig(
                thinking_level=cast(Any, "minimal")
            ),
        ),
    )

    return _extract_json_object(response.text or "")


async def extract_assets_from_images(
    image_data_urls: List[str],
    asset_descriptions: List[str],
    gemini_api_key: str,
) -> Dict[str, Any]:
    source_images = [
        source
        for image in image_data_urls
        if (source := _data_url_to_source_image(image)) is not None
    ]
    if not source_images:
        return {
            "assets": [],
            "error": "No valid input images were available for asset extraction.",
        }

    client = genai.Client(api_key=gemini_api_key)
    assets: List[Dict[str, Any]] = []

    for description in asset_descriptions:
        detection = await _locate_asset_box(client, source_images, description)
        image_index = detection.get("image_index") if detection else None
        box = _coerce_box(detection.get("box_2d")) if detection else None

        data_url = None
        status = "missing"
        if isinstance(image_index, int) and box:
            source_index = image_index - 1
            if 0 <= source_index < len(source_images):
                data_url = _crop_box_to_data_url(source_images[source_index].image, box)
                status = "ok" if data_url else "error"

        assets.append(
            {
                "description": description,
                "data_url": data_url,
                "status": status,
                "box_2d": box,
                "image_index": image_index,
                "label": detection.get("label") if detection else None,
            }
        )

    result: Dict[str, Any] = {"assets": assets}
    if any(asset["status"] != "ok" for asset in assets):
        result["error"] = "Gemini did not return usable bounding boxes for every requested asset."

    return result
