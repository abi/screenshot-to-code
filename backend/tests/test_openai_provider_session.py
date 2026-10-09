import copy
from typing import Any

import pytest

from agent.providers.base import ExecutedToolCall, ProviderTurn
from agent.providers.openai import OpenAIProviderSession
from agent.tools import ToolCall, ToolExecutionResult
from llm import Llm


class _EmptyAsyncStream:
    def __aiter__(self) -> "_EmptyAsyncStream":
        return self

    async def __anext__(self) -> object:
        raise StopAsyncIteration


class _FakeResponses:
    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []

    async def create(self, **kwargs: Any) -> _EmptyAsyncStream:
        self.calls.append(copy.deepcopy(kwargs))
        return _EmptyAsyncStream()


class _FakeOpenAIClient:
    def __init__(self) -> None:
        self.responses = _FakeResponses()

    async def close(self) -> None:
        return None


async def _noop_event_sink(_: Any) -> None:
    return None


def _test_tools() -> list[dict[str, Any]]:
    return [
        {
            "type": "function",
            "name": "edit_file",
            "description": "Apply an edit.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                },
                "required": ["path"],
            },
            "strict": True,
        }
    ]


@pytest.mark.asyncio
async def test_openai_provider_session_omits_prompt_cache_key_across_turns() -> None:
    client = _FakeOpenAIClient()
    session = OpenAIProviderSession(
        client=client,  # type: ignore[arg-type]
        model=Llm.GPT_5_5_XHIGH,
        prompt_messages=[{"role": "user", "content": "Build a landing page."}],
        tools=_test_tools(),
    )

    first_turn = await session.stream_turn(_noop_event_sink)
    await session.append_tool_results(
        ProviderTurn(
            assistant_text=first_turn.assistant_text,
            tool_calls=[],
            assistant_turn=[
                {
                    "type": "function_call",
                    "call_id": "call-1",
                    "name": "edit_file",
                    "arguments": '{"path":"index.html"}',
                }
            ],
        ),
        [
            ExecutedToolCall(
                tool_call=ToolCall(
                    id="call-1",
                    name="edit_file",
                    arguments={"path": "index.html"},
                ),
                result=ToolExecutionResult(
                    ok=True,
                    result={
                        "content": "Successfully edited file at index.html.",
                        "details": {
                            "diff": "--- index.html\n+++ index.html\n@@ -1 +1 @@\n-a\n+b\n",
                            "firstChangedLine": 1,
                        },
                    },
                    summary={"content": "Successfully edited file at index.html."},
                ),
            )
        ],
    )
    await session.stream_turn(_noop_event_sink)

    first_call = client.responses.calls[0]
    second_call = client.responses.calls[1]
    first_input = first_call["input"]
    second_input = second_call["input"]

    assert "prompt_cache_key" not in first_call
    assert "prompt_cache_key" not in second_call
    assert "prompt_cache_retention" not in first_call
    assert "prompt_cache_retention" not in second_call
    assert isinstance(first_input, list)
    assert isinstance(second_input, list)
    assert len(second_input) > len(first_input)


@pytest.mark.asyncio
async def test_openai_provider_session_omits_prompt_cache_key_for_all_prompts() -> None:
    first_client = _FakeOpenAIClient()
    second_client = _FakeOpenAIClient()
    different_prompt_client = _FakeOpenAIClient()

    first_session = OpenAIProviderSession(
        client=first_client,  # type: ignore[arg-type]
        model=Llm.GPT_5_5_XHIGH,
        prompt_messages=[{"role": "user", "content": "Build a landing page."}],
        tools=_test_tools(),
    )
    second_session = OpenAIProviderSession(
        client=second_client,  # type: ignore[arg-type]
        model=Llm.GPT_5_5_XHIGH,
        prompt_messages=[{"role": "user", "content": "Build a landing page."}],
        tools=_test_tools(),
    )
    different_prompt_session = OpenAIProviderSession(
        client=different_prompt_client,  # type: ignore[arg-type]
        model=Llm.GPT_5_5_XHIGH,
        prompt_messages=[{"role": "user", "content": "Build a dashboard."}],
        tools=_test_tools(),
    )

    await first_session.stream_turn(_noop_event_sink)
    await second_session.stream_turn(_noop_event_sink)
    await different_prompt_session.stream_turn(_noop_event_sink)

    assert "prompt_cache_key" not in first_client.responses.calls[0]
    assert "prompt_cache_key" not in second_client.responses.calls[0]
    assert "prompt_cache_key" not in different_prompt_client.responses.calls[0]


@pytest.mark.asyncio
async def test_openai_provider_session_uses_gpt_5_4_none_reasoning_effort() -> None:
    client = _FakeOpenAIClient()
    session = OpenAIProviderSession(
        client=client,  # type: ignore[arg-type]
        model=Llm.GPT_5_4_2026_03_05_NONE,
        prompt_messages=[{"role": "user", "content": "Build a dashboard."}],
        tools=_test_tools(),
    )

    await session.stream_turn(_noop_event_sink)

    first_call = client.responses.calls[0]

    assert first_call["model"] == "gpt-5.4-2026-03-05"
    assert first_call["prompt_cache_retention"] == "24h"
    assert first_call["reasoning"] == {"effort": "none", "summary": "auto"}


@pytest.mark.asyncio
async def test_openai_provider_session_uses_gpt_5_4_high_reasoning_effort() -> None:
    client = _FakeOpenAIClient()
    session = OpenAIProviderSession(
        client=client,  # type: ignore[arg-type]
        model=Llm.GPT_5_4_2026_03_05_HIGH,
        prompt_messages=[{"role": "user", "content": "Build a dashboard."}],
        tools=_test_tools(),
    )

    await session.stream_turn(_noop_event_sink)

    first_call = client.responses.calls[0]

    assert first_call["model"] == "gpt-5.4-2026-03-05"
    assert first_call["prompt_cache_retention"] == "24h"
    assert first_call["reasoning"] == {"effort": "high", "summary": "auto"}


@pytest.mark.asyncio
async def test_openai_provider_session_uses_gpt_5_4_mini_low_reasoning_effort() -> None:
    client = _FakeOpenAIClient()
    session = OpenAIProviderSession(
        client=client,  # type: ignore[arg-type]
        model=Llm.GPT_5_4_MINI_LOW,
        prompt_messages=[{"role": "user", "content": "Build a dashboard."}],
        tools=_test_tools(),
    )

    await session.stream_turn(_noop_event_sink)

    first_call = client.responses.calls[0]

    assert first_call["model"] == "gpt-5.4-mini"
    assert "prompt_cache_retention" not in first_call
    assert first_call["reasoning"] == {"effort": "low", "summary": "auto"}


@pytest.mark.parametrize(
    ("model", "effort"),
    [
        (Llm.GPT_5_5_NONE, "none"),
        (Llm.GPT_5_5_LOW, "low"),
        (Llm.GPT_5_5_MEDIUM, "medium"),
        (Llm.GPT_5_5_HIGH, "high"),
        (Llm.GPT_5_5_XHIGH, "xhigh"),
    ],
)
@pytest.mark.asyncio
async def test_openai_provider_session_uses_gpt_5_5_reasoning_effort(
    model: Llm,
    effort: str,
) -> None:
    client = _FakeOpenAIClient()
    session = OpenAIProviderSession(
        client=client,  # type: ignore[arg-type]
        model=model,
        prompt_messages=[{"role": "user", "content": "Build a dashboard."}],
        tools=_test_tools(),
    )

    await session.stream_turn(_noop_event_sink)

    first_call = client.responses.calls[0]

    assert first_call["model"] == "gpt-5.5"
    assert first_call["reasoning"] == {"effort": effort, "summary": "auto"}


@pytest.mark.parametrize(
    ("model", "effort"),
    [
        (Llm.GPT_5_6_SOL_NONE, "none"),
        (Llm.GPT_5_6_SOL_LOW, "low"),
        (Llm.GPT_5_6_SOL_MEDIUM, "medium"),
        (Llm.GPT_5_6_SOL_HIGH, "high"),
        (Llm.GPT_5_6_SOL_XHIGH, "xhigh"),
        (Llm.GPT_5_6_SOL_MAX, "max"),
    ],
)
@pytest.mark.asyncio
async def test_openai_provider_session_uses_gpt_5_6_sol_reasoning_effort(
    model: Llm,
    effort: str,
) -> None:
    client = _FakeOpenAIClient()
    session = OpenAIProviderSession(
        client=client,  # type: ignore[arg-type]
        model=model,
        prompt_messages=[{"role": "user", "content": "Build a dashboard."}],
        tools=_test_tools(),
    )

    await session.stream_turn(_noop_event_sink)

    first_call = client.responses.calls[0]
    assert first_call["model"] == "gpt-5.6-sol"
    assert first_call["reasoning"] == {"effort": effort, "summary": "auto"}


@pytest.mark.asyncio
async def test_openai_provider_session_uses_gpt_5_6_terra_low_reasoning_effort() -> None:
    client = _FakeOpenAIClient()
    session = OpenAIProviderSession(
        client=client,  # type: ignore[arg-type]
        model=Llm.GPT_5_6_TERRA_LOW,
        prompt_messages=[{"role": "user", "content": "Build a dashboard."}],
        tools=_test_tools(),
    )

    await session.stream_turn(_noop_event_sink)

    first_call = client.responses.calls[0]
    assert first_call["model"] == "gpt-5.6-terra"
    assert first_call["reasoning"] == {"effort": "low", "summary": "auto"}


@pytest.mark.asyncio
async def test_openai_provider_session_uses_original_image_detail_for_gpt_5_5() -> None:
    client = _FakeOpenAIClient()
    session = OpenAIProviderSession(
        client=client,  # type: ignore[arg-type]
        model=Llm.GPT_5_5_HIGH,
        prompt_messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Build from this screenshot."},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": "data:image/png;base64,abc",
                            "detail": "high",
                        },
                    },
                ],
            }
        ],
        tools=_test_tools(),
    )

    await session.stream_turn(_noop_event_sink)

    first_input = client.responses.calls[0]["input"]
    image_part = first_input[0]["content"][1]

    assert image_part["type"] == "input_image"
    assert image_part["detail"] == "original"


@pytest.mark.asyncio
async def test_openai_provider_session_keeps_high_image_detail_for_non_gpt_5_5() -> None:
    client = _FakeOpenAIClient()
    session = OpenAIProviderSession(
        client=client,  # type: ignore[arg-type]
        model=Llm.GPT_5_4_MINI_LOW,
        prompt_messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Build from this screenshot."},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": "data:image/png;base64,abc",
                            "detail": "low",
                        },
                    },
                ],
            }
        ],
        tools=_test_tools(),
    )

    await session.stream_turn(_noop_event_sink)

    first_input = client.responses.calls[0]["input"]
    image_part = first_input[0]["content"][1]

    assert image_part["type"] == "input_image"
    assert image_part["detail"] == "high"


def _png_data_url(width: int, height: int) -> str:
    import base64
    import io

    from PIL import Image

    buffer = io.BytesIO()
    Image.new("RGB", (width, height), (255, 255, 255)).save(buffer, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()


def _data_url_size(url: str) -> tuple[int, int]:
    import base64
    import io

    from PIL import Image

    return Image.open(io.BytesIO(base64.b64decode(url.split(",", 1)[1]))).size


@pytest.mark.asyncio
async def test_gpt_6_1_sol_downscales_images_over_patch_limit() -> None:
    import base64

    from agent.providers.openai import _patch_count
    from agent.tools.types import ToolMultimodalPart

    client = _FakeOpenAIClient()
    tall = _png_data_url(2724, 11746)  # 31,648 patches; the limit is 30,000
    session = OpenAIProviderSession(
        client=client,  # type: ignore[arg-type]
        model=Llm.GPT_6_1_SOL_HIGH,
        prompt_messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Build from this screenshot."},
                    {"type": "image_url", "image_url": {"url": tall}},
                ],
            }
        ],
        tools=_test_tools(),
    )
    await session.stream_turn(_noop_event_sink)

    image_part = client.responses.calls[0]["input"][0]["content"][1]
    assert image_part["detail"] == "original"
    width, height = _data_url_size(image_part["image_url"])
    assert _patch_count(width, height) <= 30000
    assert abs(width / height - 2724 / 11746) < 0.01

    # Tool-result images (e.g. preview screenshots) are fitted too.
    await session.append_tool_results(
        ProviderTurn(assistant_text="", tool_calls=[], assistant_turn=[]),
        [
            ExecutedToolCall(
                tool_call=ToolCall(id="call_1", name="screenshot_preview", arguments={}),
                result=ToolExecutionResult(
                    ok=True,
                    result={"status": "ok"},
                    summary={},
                    multimodal_parts=[
                        ToolMultimodalPart(
                            display_name="preview.png",
                            mime_type="image/png",
                            data=base64.b64decode(tall.split(",", 1)[1]),
                        )
                    ],
                ),
            )
        ],
    )
    await session.stream_turn(_noop_event_sink)
    tool_output = client.responses.calls[1]["input"][-1]["output"]
    width, height = _data_url_size(tool_output[1]["image_url"])
    assert _patch_count(width, height) <= 30000


@pytest.mark.asyncio
async def test_images_under_patch_limit_and_other_models_are_untouched() -> None:
    small = _png_data_url(1280, 4000)
    tall = _png_data_url(2724, 11746)
    for model, url in ((Llm.GPT_6_1_SOL_HIGH, small), (Llm.GPT_5_6_SOL_MAX, tall)):
        client = _FakeOpenAIClient()
        session = OpenAIProviderSession(
            client=client,  # type: ignore[arg-type]
            model=model,
            prompt_messages=[
                {
                    "role": "user",
                    "content": [{"type": "image_url", "image_url": {"url": url}}],
                }
            ],
            tools=_test_tools(),
        )
        await session.stream_turn(_noop_event_sink)
        assert client.responses.calls[0]["input"][0]["content"][0]["image_url"] == url


@pytest.mark.asyncio
async def test_gpt_6_1_sol_fits_images_off_the_event_loop(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import asyncio

    import agent.providers.openai as openai_provider

    offloaded: list[Any] = []
    real_to_thread = asyncio.to_thread

    async def recording_to_thread(func: Any, *args: Any) -> Any:
        offloaded.append(func)
        return await real_to_thread(func, *args)

    monkeypatch.setattr(openai_provider.asyncio, "to_thread", recording_to_thread)

    client = _FakeOpenAIClient()
    session = OpenAIProviderSession(
        client=client,  # type: ignore[arg-type]
        model=Llm.GPT_6_1_SOL_HIGH,
        prompt_messages=[
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": _png_data_url(64, 64)}}
                ],
            }
        ],
        tools=_test_tools(),
    )
    assert offloaded == []  # nothing is decoded while constructing the session
    await session.stream_turn(_noop_event_sink)
    assert offloaded == [openai_provider._fit_image_to_patch_limit]
