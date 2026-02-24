import asyncio

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
