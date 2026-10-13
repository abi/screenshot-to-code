import base64
from enum import Enum
from pathlib import Path
from typing import Any

import pytest
from PIL import Image

import mcp_server


def create_png(path: Path) -> None:
    Image.new("RGB", (2, 2), color=(255, 255, 255)).save(path, format="PNG")


def test_screenshot_data_url_reads_valid_raster_image(tmp_path: Path) -> None:
    image_path = tmp_path / "screen.png"
    create_png(image_path)

    result = mcp_server.screenshot_data_url(str(image_path))

    prefix, encoded = result.split(",", 1)
    assert prefix == "data:image/png;base64"
    assert base64.b64decode(encoded) == image_path.read_bytes()


def test_screenshot_data_url_rejects_non_image(tmp_path: Path) -> None:
    text_path = tmp_path / "screen.png"
    text_path.write_text("not an image", encoding="utf-8")

    with pytest.raises(mcp_server.McpGenerationError, match="valid raster image"):
        mcp_server.screenshot_data_url(str(text_path))


def test_build_generation_params_uses_safe_mcp_defaults() -> None:
    params = mcp_server.build_generation_params(
        data_url="data:image/png;base64,abc",
        stack="react_tailwind",
        instructions="  Match the compact layout.  ",
        design_system=None,
        generate_images=False,
        extract_assets=False,
    )

    assert params["generationType"] == "create"
    assert params["inputMode"] == "image"
    assert params["generatedCodeConfig"] == "react_tailwind"
    assert params["prompt"] == {
        "text": "Match the compact layout.",
        "images": ["data:image/png;base64,abc"],
        "videos": [],
    }
    assert params["isImageGenerationEnabled"] is False
    assert params["isAssetExtractionEnabled"] is False


def test_build_generation_params_rejects_oversized_instructions() -> None:
    with pytest.raises(mcp_server.McpGenerationError, match="Instructions exceed"):
        mcp_server.build_generation_params(
            data_url="data:image/png;base64,abc",
            stack="html_css",
            instructions="x" * (mcp_server.MAX_INSTRUCTIONS_LENGTH + 1),
            design_system=None,
            generate_images=False,
            extract_assets=False,
        )


@pytest.mark.asyncio
async def test_mcp_registers_generate_tool_with_expected_schema() -> None:
    tools = await mcp_server.mcp.list_tools()
    tool = next(tool for tool in tools if tool.name == "generate_code_from_screenshot")

    assert tool.input_schema["required"] == ["image_path"]
    assert set(tool.input_schema["properties"]["stack"]["enum"]) == {
        "html_tailwind",
        "html_css",
        "react_tailwind",
        "bootstrap",
        "vue_tailwind",
        "ionic_tailwind",
    }


@pytest.mark.asyncio
async def test_generate_single_variant_uses_first_selected_model(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, Any] = {}

    class FakeModel(Enum):
        FIRST = "first-model"
        SECOND = "second-model"

    class FakeModelSelectionStage:
        def __init__(self, _throw_error: Any) -> None:
            pass

        async def select_models(self, **_kwargs: Any) -> list[FakeModel]:
            return [FakeModel.FIRST, FakeModel.SECOND]

    class FakeGenerationStage:
        def __init__(self, **_kwargs: Any) -> None:
            pass

        async def process_variants(
            self,
            variant_models: list[FakeModel],
            prompt_messages: list[Any],
        ) -> dict[int, str]:
            captured["models"] = variant_models
            captured["prompt_messages"] = prompt_messages
            return {0: "<html></html>"}

    monkeypatch.setattr(
        mcp_server,
        "ModelSelectionStage",
        FakeModelSelectionStage,
    )
    monkeypatch.setattr(
        mcp_server,
        "AgenticGenerationStage",
        FakeGenerationStage,
    )
    params = mcp_server.build_generation_params(
        data_url="data:image/png;base64,abc",
        stack="html_css",
        instructions="Keep the labels.",
        design_system=None,
        generate_images=False,
        extract_assets=False,
    )

    result = await mcp_server.generate_single_variant(params)

    assert captured["models"] == [FakeModel.FIRST]
    assert result == {
        "code": "<html></html>",
        "model": "first-model",
        "stack": "html_css",
    }


@pytest.mark.asyncio
async def test_generate_code_from_screenshot_builds_params_and_delegates(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    image_path = tmp_path / "screen.png"
    create_png(image_path)
    captured: dict[str, Any] = {}

    async def fake_generate(params: dict[str, Any]) -> dict[str, str]:
        captured.update(params)
        return {"code": "<html></html>", "model": "test", "stack": "html_css"}

    monkeypatch.setattr(mcp_server, "generate_single_variant", fake_generate)

    result = await mcp_server.generate_code_from_screenshot(
        str(image_path),
        stack="html_css",
        instructions="Keep the labels.",
    )

    assert result["code"] == "<html></html>"
    assert captured["prompt"]["text"] == "Keep the labels."
    assert len(captured["prompt"]["images"]) == 1
