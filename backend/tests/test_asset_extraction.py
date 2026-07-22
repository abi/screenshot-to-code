import base64
import io
import json
import re
from collections.abc import Callable
from typing import Any, cast

import pytest
from google.genai import types
from PIL import Image

from asset_extraction import (
    ASSET_EXTRACTION_GEMINI_MODEL,
    MAX_ASSETS_PER_GEMINI_REQUEST,
    AssetDetectionBatch,
    AssetExtractionMetrics,
    extract_assets_from_images,
)


def _image_data_url(
    image: Image.Image,
    *,
    image_format: str = "PNG",
    mime_type: str = "image/png",
    save_kwargs: dict[str, Any] | None = None,
) -> str:
    output = io.BytesIO()
    image.save(output, format=image_format, **(save_kwargs or {}))
    encoded = base64.b64encode(output.getvalue()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def _quadrant_png_data_url(width: int = 10, height: int = 10) -> str:
    image = Image.new("RGB", (width, height), "white")
    for x in range(0, width // 2):
        for y in range(0, height // 2):
            image.putpixel((x, y), (0, 0, 0))
    return _image_data_url(image)


def _split_color_png_data_url(
    left: str = "red", right: str = "blue", width: int = 20, height: int = 10
) -> str:
    image = Image.new("RGB", (width, height), right)
    for x in range(width // 2):
        for y in range(height):
            image.putpixel((x, y), Image.new("RGB", (1, 1), left).getpixel((0, 0)))
    return _image_data_url(image)


def _decode_png_data_url(data_url: str) -> Image.Image:
    _, encoded = data_url.split(",", 1)
    image = Image.open(io.BytesIO(base64.b64decode(encoded)))
    image.load()
    return image


def _response(
    detections: list[dict[str, Any]],
    *,
    prompt_tokens: int | None = None,
    candidate_tokens: int | None = None,
    total_tokens: int | None = None,
    response_id: str | None = None,
) -> types.GenerateContentResponse:
    usage = None
    if any(
        value is not None
        for value in (prompt_tokens, candidate_tokens, total_tokens)
    ):
        usage = types.GenerateContentResponseUsageMetadata(
            prompt_token_count=prompt_tokens,
            candidates_token_count=candidate_tokens,
            total_token_count=total_tokens,
        )
    # The SDK populates `parsed` after transport parsing. Passing a dict to the
    # response constructor itself is coerced through its broad BaseModel union.
    response = types.GenerateContentResponse(
        usage_metadata=usage,
        response_id=response_id,
    )
    response.parsed = {"detections": detections}
    return response


def _install_fake_client(
    monkeypatch: pytest.MonkeyPatch,
    responder: Callable[[dict[str, Any]], types.GenerateContentResponse],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    calls: list[dict[str, Any]] = []
    clients: list[dict[str, Any]] = []

    class FakeModels:
        async def generate_content(self, **kwargs: Any) -> types.GenerateContentResponse:
            calls.append(kwargs)
            return responder(kwargs)

    class FakeAio:
        models = FakeModels()

    class FakeClient:
        aio = FakeAio()

        def __init__(self, **kwargs: Any) -> None:
            clients.append(kwargs)

    monkeypatch.setattr("asset_extraction.genai.Client", FakeClient)
    return calls, clients


def _parts_for_call(call: dict[str, Any]) -> list[types.Part]:
    contents = cast(list[types.Content], call["contents"])
    return cast(list[types.Part], contents[0].parts)


def _prompt_for_call(call: dict[str, Any]) -> str:
    return _parts_for_call(call)[-1].text or ""


@pytest.mark.asyncio
async def test_batches_assets_with_schema_config_and_maps_out_of_order_response(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def responder(_call: dict[str, Any]) -> types.GenerateContentResponse:
        return _response(
            [
                {
                    "request_id": "asset-0002",
                    "image_index": 1,
                    "box_2d": [500, 500, 1000, 1000],
                    "label": "lower-right avatar",
                },
                {
                    "request_id": "asset-0001",
                    "image_index": 1,
                    "box_2d": [0, 0, 500, 500],
                    "label": "upper-left logo",
                },
            ],
            prompt_tokens=100,
            candidate_tokens=20,
            total_tokens=120,
            response_id="provider-response-1",
        )

    calls, clients = _install_fake_client(monkeypatch, responder)
    metrics = AssetExtractionMetrics()
    descriptions = [
        "black square logo in the upper-left of screenshot 1",
        "white avatar in the lower-right of screenshot 1",
    ]

    result = await extract_assets_from_images(
        image_data_urls=[_quadrant_png_data_url()],
        asset_descriptions=descriptions,
        gemini_api_key="gemini-key",
        metrics=metrics,
    )

    # Both descriptions share one multimodal request rather than paying image
    # tokens and latency once per asset.
    assert len(calls) == 1
    assert clients[0]["api_key"] == "gemini-key"
    assert clients[0]["http_options"].api_version == "v1alpha"
    assert calls[0]["model"] == ASSET_EXTRACTION_GEMINI_MODEL

    config = cast(types.GenerateContentConfig, calls[0]["config"])
    assert config.temperature == 0.5
    assert config.response_mime_type == "application/json"
    assert config.response_schema is AssetDetectionBatch
    # Gemini v1alpha rejects the SDK's serialized `additional_properties`
    # keyword even though standard JSON Schema supports it.
    assert "additionalProperties" not in json.dumps(
        AssetDetectionBatch.model_json_schema()
    )
    assert config.thinking_config is not None
    assert config.thinking_config.thinking_level == types.ThinkingLevel.MINIMAL
    assert "Never return masks" in str(config.system_instruction)

    parts = _parts_for_call(calls[0])
    assert len(parts) == 2  # one normalized image + one prompt
    assert parts[0].inline_data is not None
    assert parts[0].inline_data.mime_type == "image/png"
    assert parts[0].media_resolution is not None
    assert (
        parts[0].media_resolution.level
        == types.PartMediaResolutionLevel.MEDIA_RESOLUTION_ULTRA_HIGH
    )

    prompt = parts[-1].text or ""
    assert '"request_id": "asset-0001"' in prompt
    assert '"request_id": "asset-0002"' in prompt
    assert "[ymin, xmin, ymax, xmax]" in prompt
    assert "smallest axis-aligned box" in prompt
    assert "Exclude surrounding UI" in prompt
    assert "Repeated lookalikes are separate instances" in prompt
    assert "image_index=null, box_2d=null" in prompt
    assert "Never return masks" in prompt
    assert "Never guess a box" in prompt

    assets = cast(list[dict[str, Any]], result["assets"])
    # Response order is intentionally reversed; result order remains caller order.
    assert [asset["description"] for asset in assets] == descriptions
    assert [asset["label"] for asset in assets] == [
        "upper-left logo",
        "lower-right avatar",
    ]
    assert assets[0]["status"] == "ok"
    assert assets[0]["box_2d"] == [0, 0, 500, 500]
    assert _decode_png_data_url(cast(str, assets[0]["data_url"])).size == (5, 5)
    assert metrics.request_count == 1
    assert metrics.prompt_token_count == 100
    assert metrics.candidate_token_count == 20
    assert metrics.total_token_count == 120
    assert metrics.response_ids == ["provider-response-1"]


@pytest.mark.asyncio
async def test_chunks_at_cookbook_25_object_cap_with_stable_global_ids(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    ids_by_call: list[list[str]] = []

    def responder(call: dict[str, Any]) -> types.GenerateContentResponse:
        request_ids = re.findall(r'"request_id": "(asset-\d{4})"', _prompt_for_call(call))
        ids_by_call.append(request_ids)
        return _response(
            [
                {
                    "request_id": request_id,
                    "image_index": None,
                    "box_2d": None,
                    "label": None,
                }
                for request_id in reversed(request_ids)
            ]
        )

    calls, _clients = _install_fake_client(monkeypatch, responder)
    descriptions = [f"asset number {index}" for index in range(51)]

    result = await extract_assets_from_images(
        image_data_urls=[_quadrant_png_data_url()],
        asset_descriptions=descriptions,
        gemini_api_key="gemini-key",
    )

    assert len(calls) == 3
    assert sorted(len(request_ids) for request_ids in ids_by_call) == [1, 25, 25]
    assert all(
        len(request_ids) <= MAX_ASSETS_PER_GEMINI_REQUEST
        for request_ids in ids_by_call
    )
    assert {request_id for ids in ids_by_call for request_id in ids} == {
        f"asset-{index:04d}" for index in range(1, 52)
    }
    assets = cast(list[dict[str, Any]], result["assets"])
    assert [asset["description"] for asset in assets] == descriptions
    assert all(asset["status"] == "missing" for asset in assets)


@pytest.mark.asyncio
async def test_maps_duplicate_instances_missing_items_and_original_source_numbers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def responder(_call: dict[str, Any]) -> types.GenerateContentResponse:
        return _response(
            [
                {
                    "request_id": "asset-0004",
                    "image_index": None,
                    "box_2d": None,
                    "label": None,
                },
                {
                    "request_id": "asset-0002",
                    "image_index": 1,
                    "box_2d": [0, 500, 1000, 1000],
                    "label": "right duplicate",
                },
                {
                    "request_id": "asset-0003",
                    "image_index": 3,
                    "box_2d": [0, 0, 1000, 1000],
                    "label": "green illustration",
                },
                {
                    "request_id": "asset-0001",
                    "image_index": 1,
                    "box_2d": [0, 0, 1000, 500],
                    "label": "left duplicate",
                },
            ]
        )

    calls, _clients = _install_fake_client(monkeypatch, responder)
    invalid_gif = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
    descriptions = [
        "left red duplicate tile in screenshot 1",
        "right blue duplicate tile in screenshot 1",
        "green illustration centered in screenshot 3",
        "orange rocket icon that is absent from every screenshot",
    ]

    result = await extract_assets_from_images(
        image_data_urls=[
            _split_color_png_data_url(),
            invalid_gif,
            _image_data_url(Image.new("RGB", (8, 6), "green")),
        ],
        asset_descriptions=descriptions,
        gemini_api_key="gemini-key",
    )

    prompt = _prompt_for_call(calls[0])
    assert "attached image 1 = source image 1" in prompt
    # Invalid source 2 is skipped without renumbering the caller's screenshot 3.
    assert "attached image 2 = source image 3" in prompt

    assets = cast(list[dict[str, Any]], result["assets"])
    assert [asset["description"] for asset in assets] == descriptions
    assert [asset["image_index"] for asset in assets] == [1, 1, 3, None]
    assert [asset["status"] for asset in assets] == ["ok", "ok", "ok", "missing"]

    left_crop = _decode_png_data_url(cast(str, assets[0]["data_url"]))
    right_crop = _decode_png_data_url(cast(str, assets[1]["data_url"]))
    third_crop = _decode_png_data_url(cast(str, assets[2]["data_url"]))
    assert left_crop.getpixel((0, 0)) == (255, 0, 0)
    assert right_crop.getpixel((0, 0)) == (0, 0, 255)
    assert third_crop.getpixel((0, 0)) == (0, 128, 0)
    assert assets[3]["data_url"] is None


@pytest.mark.asyncio
async def test_exif_orientation_is_identical_for_gemini_and_crop_source(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sent_image_sizes: list[tuple[int, int]] = []

    def responder(call: dict[str, Any]) -> types.GenerateContentResponse:
        image_part = _parts_for_call(call)[0]
        assert image_part.inline_data is not None
        sent_image = Image.open(io.BytesIO(image_part.inline_data.data or b""))
        sent_image.load()
        sent_image_sizes.append(sent_image.size)
        return _response(
            [
                {
                    "request_id": "asset-0001",
                    "image_index": 1,
                    "box_2d": [0, 0, 1000, 1000],
                    "label": "rotated photo",
                }
            ]
        )

    _calls, _clients = _install_fake_client(monkeypatch, responder)
    landscape = Image.new("RGB", (4, 2), "purple")
    exif = Image.Exif()
    exif[274] = 6  # rotate 90 degrees clockwise for display
    oriented_jpeg = _image_data_url(
        landscape,
        image_format="JPEG",
        mime_type="image/jpeg",
        save_kwargs={"exif": exif, "quality": 100},
    )

    result = await extract_assets_from_images(
        image_data_urls=[oriented_jpeg],
        asset_descriptions=["whole purple photo in screenshot 1"],
        gemini_api_key="gemini-key",
    )

    assert sent_image_sizes == [(2, 4)]
    asset = cast(list[dict[str, Any]], result["assets"])[0]
    crop = _decode_png_data_url(cast(str, asset["data_url"]))
    assert crop.size == (2, 4)


@pytest.mark.asyncio
async def test_normalizes_documented_heif_input_to_shared_png_pixels(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sent_mime_types: list[str] = []

    def responder(call: dict[str, Any]) -> types.GenerateContentResponse:
        image_part = _parts_for_call(call)[0]
        assert image_part.inline_data is not None
        sent_mime_types.append(image_part.inline_data.mime_type or "")
        return _response(
            [
                {
                    "request_id": "asset-0001",
                    "image_index": 1,
                    "box_2d": [0, 0, 1000, 1000],
                    "label": "orange HEIF image",
                }
            ]
        )

    _calls, _clients = _install_fake_client(monkeypatch, responder)
    heif_data_url = _image_data_url(
        Image.new("RGB", (3, 2), "orange"),
        image_format="HEIF",
        mime_type="image/heif",
    )

    result = await extract_assets_from_images(
        image_data_urls=[heif_data_url],
        asset_descriptions=["orange image in screenshot 1"],
        gemini_api_key="gemini-key",
    )

    assert sent_mime_types == ["image/png"]
    asset = cast(list[dict[str, Any]], result["assets"])[0]
    crop = _decode_png_data_url(cast(str, asset["data_url"]))
    assert crop.size == (3, 2)


@pytest.mark.asyncio
async def test_semantically_normalizes_or_rejects_boxes_before_crop(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def responder(_call: dict[str, Any]) -> types.GenerateContentResponse:
        return _response(
            [
                {
                    "request_id": "asset-0001",
                    "image_index": 1,
                    "box_2d": [1200, 1100, -100, -50],
                    "label": "reversed and clamped",
                },
                {
                    "request_id": "asset-0002",
                    "image_index": 1,
                    "box_2d": [0, 0, float("nan"), 500],
                    "label": "non-finite",
                },
                {
                    "request_id": "asset-0003",
                    "image_index": 1,
                    "box_2d": [-100, -100, -50, -50],
                    "label": "empty after clamp",
                },
                {
                    "request_id": "asset-0004",
                    "image_index": 1,
                    "box_2d": [0.1, 0.1, 99.9, 99.9],
                    "label": "fractional one pixel",
                },
                {
                    "request_id": "asset-0005",
                    "image_index": 99,
                    "box_2d": [0, 0, 500, 500],
                    "label": "invalid source",
                },
            ]
        )

    _calls, _clients = _install_fake_client(monkeypatch, responder)
    result = await extract_assets_from_images(
        image_data_urls=[_quadrant_png_data_url()],
        asset_descriptions=["reversed", "nan", "empty", "fractional", "bad source"],
        gemini_api_key="gemini-key",
    )

    assets = cast(list[dict[str, Any]], result["assets"])
    assert assets[0]["box_2d"] == [0, 0, 1000, 1000]
    assert assets[0]["status"] == "ok"
    assert _decode_png_data_url(cast(str, assets[0]["data_url"])).size == (10, 10)

    assert assets[1]["box_2d"] is None
    assert assets[1]["status"] == "missing"
    assert assets[2]["box_2d"] is None
    assert assets[2]["status"] == "missing"

    # Outward floor/ceil retains a real edge pixel for a small valid box.
    assert assets[3]["status"] == "ok"
    assert _decode_png_data_url(cast(str, assets[3]["data_url"])).size == (1, 1)

    assert assets[4]["box_2d"] == [0, 0, 500, 500]
    assert assets[4]["status"] == "missing"
    assert assets[4]["data_url"] is None
    assert "error" in result


@pytest.mark.asyncio
async def test_does_not_fallback_to_regex_parsing_for_fenced_free_form_json(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def responder(_call: dict[str, Any]) -> types.GenerateContentResponse:
        return types.GenerateContentResponse(
            candidates=[
                types.Candidate(
                    content=types.Content(
                        role="model",
                        parts=[
                            types.Part(
                                text=(
                                    "```json\n"
                                    '{"detections":[{"request_id":"asset-0001",'
                                    '"image_index":1,"box_2d":[0,0,500,500],'
                                    '"label":"logo"}]}\n'
                                    "```"
                                )
                            )
                        ],
                    )
                )
            ]
        )

    _calls, _clients = _install_fake_client(monkeypatch, responder)
    result = await extract_assets_from_images(
        image_data_urls=[_quadrant_png_data_url()],
        asset_descriptions=["logo"],
        gemini_api_key="gemini-key",
    )

    asset = cast(list[dict[str, Any]], result["assets"])[0]
    assert asset["status"] == "missing"
    assert asset["box_2d"] is None


@pytest.mark.asyncio
async def test_rejects_unsupported_or_undecodable_inputs_before_client_creation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client_created = False

    class UnexpectedClient:
        def __init__(self, **_kwargs: Any) -> None:
            nonlocal client_created
            client_created = True

    monkeypatch.setattr("asset_extraction.genai.Client", UnexpectedClient)

    result = await extract_assets_from_images(
        image_data_urls=[
            "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
            "data:image/png;base64,not-valid-base64",
        ],
        asset_descriptions=["logo"],
        gemini_api_key="gemini-key",
    )

    assert client_created is False
    assert result == {
        "assets": [],
        "error": "No valid input images were available for asset extraction.",
    }
