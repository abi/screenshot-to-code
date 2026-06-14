import asyncio
from pathlib import Path

import pytest

from image_generation import generation
from agent.tools.runtime import AgentToolRuntime
from agent.tools.types import ToolCall
from agent.state import AgentFileState


@pytest.mark.asyncio
async def test_process_tasks_batches_replicate_calls(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(generation, "REPLICATE_BATCH_SIZE", 3)

    concurrent = 0
    max_concurrent = 0

    async def tracking_generate(prompt: str, api_key: str) -> str:
        nonlocal concurrent, max_concurrent
        concurrent += 1
        max_concurrent = max(max_concurrent, concurrent)
        await asyncio.sleep(0.01)
        concurrent -= 1
        return f"url-for-{prompt}"

    monkeypatch.setattr(generation, "generate_image_replicate", tracking_generate)

    prompts = [f"prompt-{i}" for i in range(7)]
    results = await generation.process_tasks(prompts, "key", None, "flux")

    assert len(results) == 7
    assert results == [f"url-for-prompt-{i}" for i in range(7)]
    assert max_concurrent <= 3


@pytest.mark.asyncio
async def test_remove_background_batches_calls(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("agent.tools.runtime.REPLICATE_API_KEY", "fake-key")

    concurrent = 0
    max_concurrent = 0

    async def tracking_remove_bg(image_url: str, api_token: str) -> str:
        nonlocal concurrent, max_concurrent
        concurrent += 1
        max_concurrent = max(max_concurrent, concurrent)
        await asyncio.sleep(0.01)
        concurrent -= 1
        return f"nobg-{image_url}"

    monkeypatch.setattr("agent.tools.runtime.remove_background", tracking_remove_bg)

    runtime = AgentToolRuntime(
        file_state=AgentFileState(),
        should_generate_images=True,
        openai_api_key=None,
        openai_base_url=None,
    )

    urls = [f"https://example.com/img-{i}.png" for i in range(25)]

    result = await runtime.execute(
        ToolCall(id="test", name="remove_background", arguments={"image_urls": urls})
    )

    assert result.ok
    assert len(result.result["images"]) == 25
    assert all(r["status"] == "ok" for r in result.result["images"])
    assert max_concurrent <= 20


@pytest.mark.asyncio
async def test_remove_background_accepts_data_urls(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("agent.tools.runtime.REPLICATE_API_KEY", "fake-key")
    captured: list[str] = []

    async def tracking_remove_bg(image_url: str, api_token: str) -> str:
        captured.append(image_url)
        return "https://replicate.example/no-bg.png"

    monkeypatch.setattr("agent.tools.runtime.remove_background", tracking_remove_bg)

    runtime = AgentToolRuntime(
        file_state=AgentFileState(),
        should_generate_images=True,
        openai_api_key=None,
        openai_base_url=None,
    )
    data_url = "data:image/png;base64,aW1hZ2U="

    result = await runtime.execute(
        ToolCall(id="t", name="remove_background", arguments={"image_urls": [data_url]})
    )

    assert result.ok
    # Data URLs pass through unchanged.
    assert captured == [data_url]
    assert result.result["images"][0]["image_url"] == data_url


@pytest.mark.asyncio
async def test_remove_background_converts_localhost_asset_url_to_data_url(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr("agent.tools.runtime.REPLICATE_API_KEY", "fake-key")
    monkeypatch.setattr("agent.tools.local_assets.LOCAL_ASSET_DIR", str(tmp_path))
    (tmp_path / "asset_123.png").write_bytes(b"image")
    captured: list[str] = []

    async def tracking_remove_bg(image_url: str, api_token: str) -> str:
        captured.append(image_url)
        return "https://replicate.example/no-bg.png"

    monkeypatch.setattr("agent.tools.runtime.remove_background", tracking_remove_bg)

    runtime = AgentToolRuntime(
        file_state=AgentFileState(),
        should_generate_images=True,
        openai_api_key=None,
        openai_base_url=None,
    )
    local_url = "http://127.0.0.1:7001/local-assets/asset_123.png"

    result = await runtime.execute(
        ToolCall(id="t", name="remove_background", arguments={"image_urls": [local_url]})
    )

    assert result.ok
    # Replicate receives base64; the result keeps the original URL for display.
    assert captured == ["data:image/png;base64,aW1hZ2U="]
    assert result.result["images"][0]["image_url"] == local_url
