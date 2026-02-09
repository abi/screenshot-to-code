import pytest

from agent.providers.openai.parser import OpenAIResponsesParseState, parse_event
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
