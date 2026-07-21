from typing import Any, cast

import pytest
from openai.types.chat import ChatCompletionMessageParam

from agent.engine import AgentEngine
from agent.providers.base import EventSink, ExecutedToolCall, ProviderTurn
from llm import Llm


class NoToolProviderSession:
    def __init__(self) -> None:
        self.closed = False

    async def stream_turn(self, on_event: EventSink) -> ProviderTurn:
        return ProviderTurn(assistant_text="", tool_calls=[])

    async def append_tool_results(
        self,
        turn: ProviderTurn,
        executed_tool_calls: list[ExecutedToolCall],
    ) -> None:
        raise AssertionError("A no-tool turn must not append tool results")

    async def close(self) -> None:
        self.closed = True


def _prompt_with_media(media_url: str) -> list[ChatCompletionMessageParam]:
    return cast(
        list[ChatCompletionMessageParam],
        [
            {"role": "system", "content": "System prompt"},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": media_url, "detail": "high"},
                    },
                    {"type": "text", "text": "Build this interface."},
                ],
            },
        ],
    )


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("media_url", "expected_images", "expected_extraction_enabled"),
    [
        (
            "data:image/png;base64,aW1hZ2U=",
            ["data:image/png;base64,aW1hZ2U="],
            True,
        ),
        ("data:video/mp4;base64,dmlkZW8=", [], False),
        ("data:video/webm;base64,dmlkZW8=", [], False),
    ],
)
async def test_asset_extraction_is_only_offered_for_still_image_inputs(
    monkeypatch: pytest.MonkeyPatch,
    media_url: str,
    expected_images: list[str],
    expected_extraction_enabled: bool,
) -> None:
    factory_arguments: dict[str, Any] = {}
    session = NoToolProviderSession()

    def fake_create_provider_session(**kwargs: Any) -> NoToolProviderSession:
        factory_arguments.update(kwargs)
        return session

    monkeypatch.setattr(
        "agent.engine.create_provider_session", fake_create_provider_session
    )

    async def send_message(
        message_type: str,
        value: str | None,
        variant_index: int,
        data: dict[str, Any] | None,
        event_id: str | None,
    ) -> None:
        return None

    engine = AgentEngine(
        send_message=send_message,
        variant_index=0,
        openai_api_key=None,
        openai_base_url=None,
        anthropic_api_key=None,
        gemini_api_key="gemini-key",
        replicate_api_key=None,
        should_generate_images=True,
        should_extract_assets=True,
    )

    await engine.run(
        Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL,
        _prompt_with_media(media_url),
    )

    assert engine.tool_runtime.input_images == expected_images
    assert (
        factory_arguments["should_extract_assets"]
        is expected_extraction_enabled
    )
    assert session.closed is True
