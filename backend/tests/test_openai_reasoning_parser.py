import pytest

from agent.providers.openai import (
    OpenAIResponsesParseState,
    _convert_message_to_responses_input,
    parse_event,
)
from agent.providers.types import StreamEvent


@pytest.mark.asyncio
async def test_reasoning_summary_part_skipped_after_summary_delta() -> None:
    state = OpenAIResponsesParseState()
    events: list[StreamEvent] = []

    async def on_event(event: StreamEvent) -> None:
        events.append(event)

    await parse_event(
        {"type": "response.reasoning_summary_text.delta", "delta": "Planning step."},
        state,
        on_event,
    )
    await parse_event(
        {
            "type": "response.reasoning_summary_part.done",
            "part": {"text": "Planning step."},
        },
        state,
        on_event,
    )

    thinking_text = [event.text for event in events if event.type == "thinking_delta"]
    assert thinking_text == ["Planning step."]


@pytest.mark.asyncio
async def test_reasoning_summary_part_added_and_done_emits_once() -> None:
    state = OpenAIResponsesParseState()
    events: list[StreamEvent] = []

    async def on_event(event: StreamEvent) -> None:
        events.append(event)

    await parse_event(
        {
            "type": "response.reasoning_summary_part.added",
            "part": {"text": "Refining layout and assets."},
        },
        state,
        on_event,
    )
    await parse_event(
        {
            "type": "response.reasoning_summary_part.done",
            "part": {"text": "Refining layout and assets."},
        },
        state,
        on_event,
    )

    thinking_text = [event.text for event in events if event.type == "thinking_delta"]
    assert thinking_text == ["Refining layout and assets."]


def test_convert_image_url_defaults_to_high_detail() -> None:
    message = {
        "role": "user",
        "content": [
            {"type": "image_url", "image_url": {"url": "data:image/png;base64,abc"}},
        ],
    }
    result = _convert_message_to_responses_input(message)  # type: ignore
    image_part = result["content"][0]
    assert image_part["detail"] == "high"


def test_convert_image_url_preserves_explicit_detail() -> None:
    message = {
        "role": "user",
        "content": [
            {
                "type": "image_url",
                "image_url": {"url": "data:image/png;base64,abc", "detail": "low"},
            },
        ],
    }
    result = _convert_message_to_responses_input(message)  # type: ignore
    image_part = result["content"][0]
    assert image_part["detail"] == "low"
