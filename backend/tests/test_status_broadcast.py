from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from typing import Any, cast

import pytest

from routes.generate_code import (
    ExtractedParams,
    PipelineContext,
    StatusBroadcastMiddleware,
)


@pytest.mark.asyncio
async def test_video_update_broadcasts_two_variants() -> None:
    sent_messages: list[tuple[str, str | None, int]] = []

    async def send_message(
        msg_type: str,
        value: str | None,
        variant_index: int,
        data=None,
        eventId=None,
    ) -> None:
        sent_messages.append((msg_type, value, variant_index))

    context = PipelineContext(websocket=MagicMock())
    context.ws_comm = cast(
        Any,
        SimpleNamespace(
            send_message=send_message,
            throw_error=AsyncMock(),
        ),
    )
    context.extracted_params = ExtractedParams(
        stack="html_tailwind",
        input_mode="video",
        should_generate_images=True,
        openai_api_key=None,
        anthropic_api_key=None,
        openai_base_url=None,
        generation_type="update",
        prompt={"text": "Edit this video output", "images": [], "videos": []},
        history=[],
        file_state=None,
        option_codes=[],
    )

    middleware = StatusBroadcastMiddleware()
    next_called = False

    async def next_func() -> None:
        nonlocal next_called
        next_called = True

    await middleware.process(context, next_func)

    assert sent_messages[0] == ("variantCount", "2", 0)
    status_messages = [m for m in sent_messages if m[0] == "status"]
    assert len(status_messages) == 2
    assert [m[2] for m in status_messages] == [0, 1]
    assert next_called is True
