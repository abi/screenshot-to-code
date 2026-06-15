import base64
from pathlib import Path
from typing import Any, cast

import pytest

from agent.state import AgentFileState
from agent.tools.runtime import AgentToolRuntime
from agent.tools.types import ToolCall
from uploaded_assets import persist_data_url_as_temporary_asset


def _data_url(payload: bytes, content_type: str = "image/png") -> str:
    encoded = base64.b64encode(payload).decode("ascii")
    return f"data:{content_type};base64,{encoded}"


def test_edit_file_returns_structured_result_with_diff() -> None:
    runtime = AgentToolRuntime(
        file_state=AgentFileState(
            path="index.html",
            content="<div>before</div>\n<p>keep</p>\n",
        ),
        should_generate_images=False,
        openai_api_key=None,
        openai_base_url=None,
    )

    result = runtime._edit_file(
        {
            "old_text": "<div>before</div>",
            "new_text": "<div>after</div>",
        }
    )

    assert result.ok is True
    assert result.updated_content == "<div>after</div>\n<p>keep</p>\n"
    assert result.result["content"] == "Successfully edited file at index.html."
    assert set(result.result["details"].keys()) == {"diff", "firstChangedLine"}
    assert result.result["details"]["firstChangedLine"] == 1
    assert "--- index.html" in result.result["details"]["diff"]
    assert "+++ index.html" in result.result["details"]["diff"]
    assert "-<div>before</div>" in result.result["details"]["diff"]
    assert "+<div>after</div>" in result.result["details"]["diff"]
    assert result.summary["firstChangedLine"] == 1
    assert result.summary["diff"] == result.result["details"]["diff"]


@pytest.mark.asyncio
async def test_execute_edit_file_uses_updated_result_shape() -> None:
    runtime = AgentToolRuntime(
        file_state=AgentFileState(path="index.html", content="<main>old</main>"),
        should_generate_images=False,
        openai_api_key=None,
        openai_base_url=None,
    )

    result = await runtime.execute(
        ToolCall(
            id="call-1",
            name="edit_file",
            arguments={"old_text": "old", "new_text": "new"},
        )
    )

    # execute() is sync for edit_file and should preserve the structured payload.
    assert result.ok is True
    assert result.result["content"] == "Successfully edited file at index.html."
    assert set(result.result["details"].keys()) == {"diff", "firstChangedLine"}
    assert "--- index.html" in result.result["details"]["diff"]


@pytest.mark.asyncio
async def test_save_assets_promotes_temporary_asset_id(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    temp_dir = tmp_path / "tmp-assets"
    asset_dir = tmp_path / "local-assets"
    monkeypatch.setattr("uploaded_assets.store.TEMP_ASSET_DIR", str(temp_dir))
    monkeypatch.setattr("uploaded_assets.store.LOCAL_ASSET_DIR", str(asset_dir))

    temp_asset = persist_data_url_as_temporary_asset(
        _data_url(b"image-bytes"),
        "http://127.0.0.1:7001",
    )
    assert temp_asset is not None

    runtime = AgentToolRuntime(
        file_state=AgentFileState(),
        should_generate_images=False,
        openai_api_key=None,
        openai_base_url=None,
    )

    result = await runtime.execute(
        ToolCall(
            id="call-1",
            name="save_assets",
            arguments={"asset_ids": [temp_asset.asset_id]},
        )
    )

    assert result.ok is True
    images = result.result["images"]
    assert len(images) == 1
    assert images[0]["asset_id"] == temp_asset.asset_id
    assert images[0]["status"] == "ok"
    assert images[0]["public_url"].startswith(
        "http://127.0.0.1:7001/local-assets/"
    )
    assert temp_asset.asset_id not in images[0]["public_url"]
    assert len(list(asset_dir.iterdir())) == 1


@pytest.mark.asyncio
async def test_extract_assets_requires_gemini_api_key() -> None:
    runtime = AgentToolRuntime(
        file_state=AgentFileState(),
        should_generate_images=False,
        openai_api_key=None,
        openai_base_url=None,
        input_images=[_data_url(b"source-image")],
    )

    result = await runtime.execute(
        ToolCall(
            id="call-1",
            name="extract_assets",
            arguments={"asset_descriptions": ["logo"]},
        )
    )

    assert result.ok is False
    assert result.summary["error"] == "Missing Gemini API key"


@pytest.mark.asyncio
async def test_extract_assets_returns_mocked_gemini_assets(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    temp_dir = tmp_path / "tmp-assets"
    asset_dir = tmp_path / "local-assets"
    monkeypatch.setattr("uploaded_assets.store.TEMP_ASSET_DIR", str(temp_dir))
    monkeypatch.setattr("uploaded_assets.store.LOCAL_ASSET_DIR", str(asset_dir))

    async def fake_extract_assets_from_images(
        image_data_urls: list[str],
        asset_descriptions: list[str],
        gemini_api_key: str,
    ) -> dict[str, object]:
        assert image_data_urls == [_data_url(b"source-image")]
        assert asset_descriptions == ["logo", "avatar"]
        assert gemini_api_key == "gemini-key"
        return {
            "assets": [
                {
                    "description": "logo",
                    "data_url": _data_url(b"logo-image"),
                    "status": "ok",
                    "box_2d": [0, 0, 500, 500],
                    "image_index": 1,
                    "label": "logo",
                },
                {
                    "description": "avatar",
                    "data_url": _data_url(b"avatar-image"),
                    "status": "ok",
                },
            ]
        }

    monkeypatch.setattr(
        "agent.tools.extract_assets.extract_assets_from_images",
        fake_extract_assets_from_images,
    )

    runtime = AgentToolRuntime(
        file_state=AgentFileState(),
        should_generate_images=False,
        openai_api_key=None,
        openai_base_url=None,
        gemini_api_key="gemini-key",
        input_images=[_data_url(b"source-image")],
        asset_base_url="http://127.0.0.1:7001",
    )

    result = await runtime.execute(
        ToolCall(
            id="call-1",
            name="extract_assets",
            arguments={"asset_descriptions": ["logo", "avatar"]},
        )
    )

    assert result.ok is True
    assert result.result["assets"][0]["description"] == "logo"
    assert result.result["assets"][0]["public_url"].startswith(
        "http://127.0.0.1:7001/local-assets/"
    )
    assert result.summary["assets"][0]["public_url"].startswith(
        "http://127.0.0.1:7001/local-assets/"
    )
    # Extracted crops finalize straight to the served store — no temp staging.
    assert not temp_dir.exists()
    assert len(list(asset_dir.iterdir())) == 2
    # No save_assets-style id is surfaced (already finalized), so the model
    # can't redundantly promote extracted crops.
    assert "asset_id" not in result.result["assets"][0]
    assert "asset_id" not in result.summary["assets"][0]
    assert result.result["assets"][0]["image_part_index"] == 0
    assert result.result["assets"][0]["image_display_name"] == "asset_0.png"
    assert result.result["assets"][1]["image_part_index"] == 1
    assert result.result["assets"][1]["image_display_name"] == "asset_1.png"
    assert result.summary["assets"][0]["box_2d"] == [0, 0, 500, 500]
    assert result.summary["assets"][0]["image_index"] == 1
    assert result.multimodal_parts is not None
    assert [part.display_name for part in result.multimodal_parts] == [
        "asset_0.png",
        "asset_1.png",
    ]
    assert result.multimodal_parts[0].mime_type == "image/png"
    assert result.multimodal_parts[0].data == b"logo-image"


@pytest.mark.asyncio
async def test_screenshot_preview_requires_file_content() -> None:
    runtime = AgentToolRuntime(
        file_state=AgentFileState(),
        should_generate_images=False,
        openai_api_key=None,
        openai_base_url=None,
    )

    result = await runtime.execute(
        ToolCall(id="call-1", name="screenshot_preview", arguments={})
    )

    assert result.ok is False
    assert "create_file" in result.result["error"]


@pytest.mark.asyncio
async def test_screenshot_preview_returns_image_part(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    temp_dir = tmp_path / "tmp-assets"
    asset_dir = tmp_path / "local-assets"
    monkeypatch.setattr("uploaded_assets.store.TEMP_ASSET_DIR", str(temp_dir))
    monkeypatch.setattr("uploaded_assets.store.LOCAL_ASSET_DIR", str(asset_dir))

    captured: list[dict[str, object]] = []

    async def fake_capture(
        html: str,
        device: str = "desktop",
        full_page: bool = True,
    ) -> bytes:
        captured.append({"html": html, "device": device, "full_page": full_page})
        return f"{device}-png-bytes".encode("ascii")

    monkeypatch.setattr(
        "agent.tools.screenshot_preview.capture_preview_screenshot", fake_capture
    )
    runtime = AgentToolRuntime(
        file_state=AgentFileState(path="index.html", content="<main>hi</main>"),
        should_generate_images=False,
        openai_api_key=None,
        openai_base_url=None,
        asset_base_url="http://127.0.0.1:7001",
    )

    result = await runtime.execute(
        ToolCall(
            id="call-1",
            name="screenshot_preview",
            arguments={"ignored": "value"},
        )
    )

    assert result.ok is True
    assert captured == [
        {"html": "<main>hi</main>", "device": "desktop", "full_page": True},
        {"html": "<main>hi</main>", "device": "mobile", "full_page": True},
    ]
    assert result.result["details"]["screenshots"] == [
        {
            "viewport": "desktop",
            "full_page": True,
            "image_part_index": 0,
            "image_display_name": "preview_desktop.png",
            "image_bytes": len(b"desktop-png-bytes"),
        },
        {
            "viewport": "mobile",
            "full_page": True,
            "image_part_index": 1,
            "image_display_name": "preview_mobile.png",
            "image_bytes": len(b"mobile-png-bytes"),
        },
    ]
    assert result.summary["status"] == "ok"
    screenshots = cast(list[dict[str, Any]], result.summary["screenshots"])
    # Previews are inlined as data URLs for the UI, not persisted as assets.
    desktop_url = cast(str, screenshots[0]["image_url"])
    mobile_url = cast(str, screenshots[1]["image_url"])
    assert desktop_url.startswith("data:image/png;base64,")
    assert mobile_url.startswith("data:image/png;base64,")
    assert desktop_url != mobile_url
    assert base64.b64decode(desktop_url.split(",", 1)[1]) == b"desktop-png-bytes"
    assert base64.b64decode(mobile_url.split(",", 1)[1]) == b"mobile-png-bytes"
    # UI URLs and image payloads must not leak into the model-facing result payload.
    assert "image_url" not in result.result["details"]["screenshots"][0]
    assert "image_data_url" not in result.result["details"]["screenshots"][0]
    # Previews are not assets: nothing is written to the temp or served stores.
    assert not asset_dir.exists()
    assert not temp_dir.exists()
    assert result.multimodal_parts is not None
    assert [part.display_name for part in result.multimodal_parts] == [
        "preview_desktop.png",
        "preview_mobile.png",
    ]
    assert result.multimodal_parts[0].mime_type == "image/png"
    assert result.multimodal_parts[0].data == b"desktop-png-bytes"
    assert result.multimodal_parts[1].mime_type == "image/png"
    assert result.multimodal_parts[1].data == b"mobile-png-bytes"


@pytest.mark.asyncio
async def test_screenshot_preview_reports_capture_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def failing_capture(
        html: str,
        device: str = "desktop",
        full_page: bool = True,
    ) -> bytes:
        raise Exception("boom")

    monkeypatch.setattr(
        "agent.tools.screenshot_preview.capture_preview_screenshot", failing_capture
    )
    runtime = AgentToolRuntime(
        file_state=AgentFileState(path="index.html", content="<main>hi</main>"),
        should_generate_images=False,
        openai_api_key=None,
        openai_base_url=None,
    )

    result = await runtime.execute(
        ToolCall(id="call-1", name="screenshot_preview", arguments={})
    )

    assert result.ok is False
    assert "boom" in result.result["error"]
