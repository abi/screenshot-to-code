import base64
import io

import pytest
from google.genai import types
from PIL import Image

from asset_extraction import extract_assets_from_images


def _png_data_url(width: int = 10, height: int = 10) -> str:
    image = Image.new("RGB", (width, height), "white")
    # Put a black square in the top-left quadrant so the crop is inspectable.
    for x in range(0, width // 2):
        for y in range(0, height // 2):
            image.putpixel((x, y), (0, 0, 0))

    output = io.BytesIO()
    image.save(output, format="PNG")
    encoded = base64.b64encode(output.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def _decode_png_data_url(data_url: str) -> Image.Image:
    _, encoded = data_url.split(",", 1)
    image = Image.open(io.BytesIO(base64.b64decode(encoded)))
    image.load()
    return image


@pytest.mark.asyncio
async def test_extract_assets_from_images_uses_gemini_boxes_and_crops_original(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[dict[str, object]] = []

    class FakeModels:
        async def generate_content(self, **kwargs):
            calls.append(kwargs)
            return types.GenerateContentResponse(
                candidates=[
                    types.Candidate(
                        content=types.Content(
                            role="model",
                            parts=[
                                types.Part(
                                    text=(
                                        '{"image_index": 1, '
                                        '"box_2d": [0, 0, 500, 500], '
                                        '"label": "logo"}'
                                    )
                                )
                            ],
                        )
                    )
                ]
            )

    class FakeAio:
        models = FakeModels()

    class FakeClient:
        aio = FakeAio()

        def __init__(self, api_key: str) -> None:
            assert api_key == "gemini-key"

    monkeypatch.setattr("asset_extraction.genai.Client", FakeClient)

    result = await extract_assets_from_images(
        image_data_urls=[_png_data_url()],
        asset_descriptions=["logo", "avatar"],
        gemini_api_key="gemini-key",
    )

    assert len(calls) == 2
    assert calls[0]["model"] == "gemini-3-flash-preview"
    assets = result["assets"]
    assert assets[0]["description"] == "logo"
    assert assets[0]["status"] == "ok"
    assert assets[0]["box_2d"] == [0, 0, 500, 500]
    cropped = _decode_png_data_url(assets[0]["data_url"])
    assert cropped.size == (5, 5)
