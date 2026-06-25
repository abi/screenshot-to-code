"""Tool images reach every provider: public URLs go straight to Anthropic/OpenAI,
local bytes are base64'd, and Gemini always gets inline bytes (fetching URLs)."""

import base64
from pathlib import Path
from typing import Any, List, cast

import pytest
from google.genai import types

from agent.providers.anthropic.provider import AnthropicProviderSession
from agent.providers.base import ExecutedToolCall, ProviderTurn
from agent.providers.gemini import GeminiProviderSession
from agent.providers.openai import OpenAIProviderSession
from agent.state import AgentFileState
from agent.tools.runtime import AgentToolRuntime
from agent.tools.types import ToolCall, ToolExecutionResult, ToolMultimodalPart
from llm import Llm

PUBLIC = ToolMultimodalPart(
    display_name="generated.png",
    mime_type="image/png",
    image_url="https://replicate.delivery/abc/out.png",
)
LOCAL_IMAGE_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)
LOCAL = ToolMultimodalPart(
    display_name="crop.png", mime_type="image/png", data=LOCAL_IMAGE_BYTES
)


def test_multimodal_part_enforces_source_invariant() -> None:
    # Valid: exactly one source.
    ToolMultimodalPart(display_name="a", mime_type="image/png", data=b"x")
    ToolMultimodalPart(
        display_name="a", mime_type="image/png", image_url="https://x/y.png"
    )
    # Neither source.
    with pytest.raises(ValueError):
        ToolMultimodalPart(display_name="a", mime_type="image/png")
    # Both sources.
    with pytest.raises(ValueError):
        ToolMultimodalPart(
            display_name="a", mime_type="image/png", data=b"x", image_url="https://x/y"
        )
    # A localhost URL isn't model-reachable and must be rejected.
    with pytest.raises(ValueError, match="publicly fetchable"):
        ToolMultimodalPart(
            display_name="a",
            mime_type="image/png",
            image_url="http://127.0.0.1:7011/local-assets/z.png",
        )


def _executed(parts: List[ToolMultimodalPart], ok: bool = True) -> ExecutedToolCall:
    return ExecutedToolCall(
        tool_call=ToolCall(id="call-1", name="extract_assets", arguments={}),
        result=ToolExecutionResult(
            ok=ok, result={"k": "v"}, summary={}, multimodal_parts=parts
        ),
    )


@pytest.mark.asyncio
async def test_anthropic_url_for_public_processes_local_bytes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    processed_data = "processed-image"
    captured_images: list[tuple[bytes, str]] = []

    def fake_process_image_bytes(image_bytes: bytes, media_type: str) -> tuple[str, str]:
        captured_images.append((image_bytes, media_type))
        return ("image/jpeg", processed_data)

    monkeypatch.setattr(
        "agent.providers.anthropic.provider.process_image_bytes",
        fake_process_image_bytes,
    )
    session = AnthropicProviderSession(
        client=object(),  # type: ignore[arg-type]
        model=Llm.CLAUDE_OPUS_4_8_HIGH,
        prompt_messages=[
            {"role": "system", "content": "sys"},
            {"role": "user", "content": "hi"},
        ],
        tools=[],
    )
    await session.append_tool_results(
        ProviderTurn(assistant_text="", tool_calls=[], assistant_turn=None),
        [_executed([PUBLIC, LOCAL])],
    )
    content = session._messages[-1]["content"][0]["content"]  # type: ignore[index]
    images = [b for b in content if b.get("type") == "image"]
    assert images[0]["source"] == {"type": "url", "url": PUBLIC.image_url}
    assert captured_images == [(LOCAL_IMAGE_BYTES, "image/png")]
    assert images[1]["source"] == {
        "type": "base64",
        "media_type": "image/jpeg",
        "data": processed_data,
    }


@pytest.mark.asyncio
async def test_anthropic_error_drops_images() -> None:
    session = AnthropicProviderSession(
        client=object(),  # type: ignore[arg-type]
        model=Llm.CLAUDE_OPUS_4_8_HIGH,
        prompt_messages=[
            {"role": "system", "content": "sys"},
            {"role": "user", "content": "hi"},
        ],
        tools=[],
    )
    await session.append_tool_results(
        ProviderTurn(assistant_text="", tool_calls=[], assistant_turn=None),
        [_executed([PUBLIC], ok=False)],
    )
    block = session._messages[-1]["content"][0]  # type: ignore[index]
    assert isinstance(block["content"], str)  # plain text only on error
    assert block["is_error"] is True


@pytest.mark.asyncio
async def test_openai_url_for_public_dataurl_for_local_with_detail() -> None:

    session = OpenAIProviderSession(
        client=object(),  # type: ignore[arg-type]
        model=Llm.GPT_5_5_HIGH,
        prompt_messages=[{"role": "user", "content": "hi"}],
        tools=[],
    )
    await session.append_tool_results(
        ProviderTurn(assistant_text="", tool_calls=[], assistant_turn=[]),
        [_executed([PUBLIC, LOCAL])],
    )
    output = session._input_items[-1]["output"]
    assert output[0]["type"] == "input_text"
    images = [p for p in output if p.get("type") == "input_image"]
    assert images[0]["image_url"] == PUBLIC.image_url
    assert images[1]["image_url"] == (
        "data:image/png;base64," + base64.b64encode(LOCAL_IMAGE_BYTES).decode()
    )
    assert all("detail" in p for p in images)


@pytest.mark.asyncio
async def test_gemini_inlines_local_bytes_and_fetches_public_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:

    class _Resp:
        content = b"fetched-bytes"
        headers = {"content-type": "image/webp"}

        def raise_for_status(self) -> None:
            pass

    class _Client:
        def __init__(self, *a: Any, **k: Any) -> None:
            pass

        async def __aenter__(self) -> "_Client":
            return self

        async def __aexit__(self, *a: Any) -> bool:
            return False

        async def get(self, url: str) -> _Resp:
            return _Resp()

    monkeypatch.setattr("agent.providers.gemini.httpx.AsyncClient", _Client)

    session = GeminiProviderSession(
        client=object(),  # type: ignore[arg-type]
        model=Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL,
        prompt_messages=[
            {"role": "system", "content": "sys"},
            {"role": "user", "content": "hi"},
        ],
        tools=[],
    )
    model_turn = types.Content(
        role="model",
        parts=[types.Part.from_function_call(name="extract_assets", args={})],
    )
    await session.append_tool_results(
        ProviderTurn(assistant_text="", tool_calls=[], assistant_turn=model_turn),
        [_executed([PUBLIC, LOCAL])],
    )
    parts = cast(Any, session._contents[-1].parts)
    response_parts = cast(Any, parts[0].function_response).parts
    # Public URL was downloaded; content-type header drives the mime.
    assert response_parts[0].inline_data.data == b"fetched-bytes"
    assert response_parts[0].inline_data.mime_type == "image/webp"
    # Local bytes inlined as-is.
    assert response_parts[1].inline_data.data == LOCAL_IMAGE_BYTES


@pytest.mark.asyncio
async def test_generate_images_emits_url_parts(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("agent.tools.runtime.REPLICATE_API_KEY", "fake-key")

    async def fake_process_tasks(
        prompts: List[str], api_key: str, base_url: Any, model: str
    ) -> List[str]:
        return [f"https://replicate.delivery/{p}.png" for p in prompts]

    monkeypatch.setattr("agent.tools.runtime.process_tasks", fake_process_tasks)
    runtime = AgentToolRuntime(
        file_state=AgentFileState(),
        should_generate_images=True,
        openai_api_key=None,
        openai_base_url=None,
    )
    result = await runtime.execute(
        ToolCall(id="t", name="generate_images", arguments={"prompts": ["a logo"]})
    )
    assert result.multimodal_parts is not None
    assert result.multimodal_parts[0].image_url == "https://replicate.delivery/a logo.png"
    assert result.multimodal_parts[0].data is None


@pytest.mark.asyncio
async def test_edit_image_emits_url_part(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("agent.tools.runtime.REPLICATE_API_KEY", "fake-key")

    async def fake_edit_image(**kwargs: Any) -> str:
        return "https://replicate.delivery/edited.png"

    monkeypatch.setattr("agent.tools.runtime.edit_image", fake_edit_image)
    runtime = AgentToolRuntime(
        file_state=AgentFileState(),
        should_generate_images=True,
        openai_api_key=None,
        openai_base_url=None,
    )
    result = await runtime.execute(
        ToolCall(
            id="t",
            name="edit_image",
            arguments={"prompt": "bw", "image_urls": ["https://x/in.png"]},
        )
    )
    assert result.multimodal_parts is not None
    assert result.multimodal_parts[0].image_url == "https://replicate.delivery/edited.png"


@pytest.mark.asyncio
async def test_save_assets_emits_byte_parts(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr("agent.tools.local_assets.LOCAL_ASSET_DIR", str(tmp_path))
    (tmp_path / "asset_x.png").write_bytes(b"saved-image")

    class _Saved:
        public_url = "http://127.0.0.1:7001/local-assets/asset_x.png"
        content_type = "image/png"

    async def fake_promote(asset_id, user_id=None):  # type: ignore[no-untyped-def]
        return _Saved()

    monkeypatch.setattr(
        "uploaded_assets.tools.promote_temporary_asset_id", fake_promote
    )
    from uploaded_assets.tools import run_save_assets

    result = await run_save_assets({"asset_ids": ["asset_x"]}, user_id=None)
    assert result.multimodal_parts is not None
    assert result.multimodal_parts[0].data == b"saved-image"
    assert result.multimodal_parts[0].image_url is None
