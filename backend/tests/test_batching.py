import asyncio

import pytest

from image_generation import generation
from image_generation.aspect_ratios import DEFAULT_ASPECT_RATIO
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
    seen_aspect_ratios: list[str] = []

    async def tracking_generate(prompt: str, api_key: str, aspect_ratio: str) -> str:
        nonlocal concurrent, max_concurrent
        concurrent += 1
        max_concurrent = max(max_concurrent, concurrent)
        seen_aspect_ratios.append(aspect_ratio)
        await asyncio.sleep(0.01)
        concurrent -= 1
        return f"url-for-{prompt}"

    monkeypatch.setattr(generation, "generate_image_replicate", tracking_generate)

    prompts = [f"prompt-{i}" for i in range(7)]
    results = await generation.process_tasks(prompts, "key", None, "flux")

    assert len(results) == 7
    assert results == [f"url-for-prompt-{i}" for i in range(7)]
    assert max_concurrent <= 3
    assert seen_aspect_ratios == [DEFAULT_ASPECT_RATIO] * 7


@pytest.mark.asyncio
async def test_process_tasks_ignores_aspect_ratio_for_dalle(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, object] = {}

    async def tracking_dalle(prompt: str, api_key: str, base_url: str | None) -> str:
        captured["prompt"] = prompt
        captured["api_key"] = api_key
        captured["base_url"] = base_url
        return "url-for-dalle"

    monkeypatch.setattr(generation, "generate_image_dalle", tracking_dalle)

    results = await generation.process_tasks(
        ["prompt-1"],
        "openai-key",
        None,
        "dalle3",
        aspect_ratio="9:16",
    )

    assert results == ["url-for-dalle"]
    assert captured["prompt"] == "prompt-1"
    assert captured["api_key"] == "openai-key"
    assert captured["base_url"] is None


@pytest.mark.asyncio
async def test_generate_images_uses_default_aspect_ratio(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("agent.tools.runtime.REPLICATE_API_KEY", "fake-key")
    calls: list[dict[str, object]] = []

    async def fake_process_tasks(
        prompts: list[str],
        api_key: str,
        base_url: str | None,
        model: str,
        aspect_ratio: str = DEFAULT_ASPECT_RATIO,
    ) -> list[str]:
        calls.append(
            {
                "prompts": prompts,
                "api_key": api_key,
                "base_url": base_url,
                "model": model,
                "aspect_ratio": aspect_ratio,
            }
        )
        return [f"https://example.com/{prompt}.png" for prompt in prompts]

    monkeypatch.setattr("agent.tools.runtime.process_tasks", fake_process_tasks)

    runtime = AgentToolRuntime(
        file_state=AgentFileState(),
        should_generate_images=True,
        openai_api_key=None,
        openai_base_url=None,
    )
    result = await runtime.execute(
        ToolCall(
            id="test",
            name="generate_images",
            arguments={"prompts": [{"prompt": "test prompt"}]},
        )
    )

    assert result.ok
    assert len(calls) == 1
    assert calls[0]["aspect_ratio"] == DEFAULT_ASPECT_RATIO
    assert result.result["images"][0]["aspect_ratio"] == DEFAULT_ASPECT_RATIO


@pytest.mark.asyncio
async def test_generate_images_supports_per_prompt_aspect_ratios(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("agent.tools.runtime.REPLICATE_API_KEY", "fake-key")
    calls: list[dict[str, object]] = []

    async def fake_process_tasks(
        prompts: list[str],
        api_key: str,
        base_url: str | None,
        model: str,
        aspect_ratio: str = DEFAULT_ASPECT_RATIO,
    ) -> list[str]:
        calls.append(
            {
                "prompts": prompts,
                "aspect_ratio": aspect_ratio,
            }
        )
        return [
            f"https://example.com/{aspect_ratio}/{index}.png"
            for index, _prompt in enumerate(prompts)
        ]

    monkeypatch.setattr("agent.tools.runtime.process_tasks", fake_process_tasks)

    runtime = AgentToolRuntime(
        file_state=AgentFileState(),
        should_generate_images=True,
        openai_api_key=None,
        openai_base_url=None,
    )
    result = await runtime.execute(
        ToolCall(
            id="test",
            name="generate_images",
            arguments={
                "prompts": [
                    {"prompt": "square prompt"},
                    {"prompt": "wide prompt", "aspect_ratio": "16:9"},
                    {"prompt": "tall prompt", "aspect_ratio": "9:16"},
                ]
            },
        )
    )

    assert result.ok
    assert [call["aspect_ratio"] for call in calls] == [
        DEFAULT_ASPECT_RATIO,
        "16:9",
        "9:16",
    ]
    assert [item["aspect_ratio"] for item in result.result["images"]] == [
        DEFAULT_ASPECT_RATIO,
        "16:9",
        "9:16",
    ]


@pytest.mark.asyncio
async def test_generate_images_rejects_batch_level_aspect_ratio(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("agent.tools.runtime.REPLICATE_API_KEY", "fake-key")

    runtime = AgentToolRuntime(
        file_state=AgentFileState(),
        should_generate_images=True,
        openai_api_key=None,
        openai_base_url=None,
    )
    result = await runtime.execute(
        ToolCall(
            id="test",
            name="generate_images",
            arguments={"prompts": [{"prompt": "test prompt"}], "aspect_ratio": "16:9"},
        )
    )

    assert not result.ok
    assert result.summary["error"] == "Invalid aspect_ratio"


@pytest.mark.asyncio
async def test_generate_images_rejects_invalid_per_prompt_aspect_ratio(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("agent.tools.runtime.REPLICATE_API_KEY", "fake-key")

    runtime = AgentToolRuntime(
        file_state=AgentFileState(),
        should_generate_images=True,
        openai_api_key=None,
        openai_base_url=None,
    )
    result = await runtime.execute(
        ToolCall(
            id="test",
            name="generate_images",
            arguments={
                "prompts": [
                    {"prompt": "test prompt", "aspect_ratio": "7:5"},
                ]
            },
        )
    )

    assert not result.ok
    assert result.summary["error"] == "Invalid aspect_ratio"


@pytest.mark.asyncio
async def test_generate_images_rejects_non_object_prompt_items(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("agent.tools.runtime.REPLICATE_API_KEY", "fake-key")

    runtime = AgentToolRuntime(
        file_state=AgentFileState(),
        should_generate_images=True,
        openai_api_key=None,
        openai_base_url=None,
    )
    result = await runtime.execute(
        ToolCall(
            id="test",
            name="generate_images",
            arguments={"prompts": ["legacy string prompt"]},
        )
    )

    assert not result.ok
    assert result.summary["error"] == "Invalid prompts payload"


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
