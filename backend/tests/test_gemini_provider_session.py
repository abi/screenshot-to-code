import copy
from types import SimpleNamespace
from typing import Any, List

import pytest

from agent.providers.base import ProviderTurn, StreamEvent, ExecutedToolCall
from agent.providers.gemini import GeminiProviderSession, serialize_gemini_tools
from agent.tools import CanonicalToolDefinition, ToolCall, ToolExecutionResult
from llm import Llm


# ---------------------------------------------------------------------------
# Fakes that mimic the Interactions API streaming surface.
# ---------------------------------------------------------------------------


class _FakeAsyncStream:
    def __init__(self, events: List[Any]) -> None:
        self._events = events

    def __aiter__(self) -> "_FakeAsyncStream":
        self._iter = iter(self._events)
        return self

    async def __anext__(self) -> Any:
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration


class _FakeInteractions:
    def __init__(self, scripted: List[List[Any]]) -> None:
        # ``scripted`` is one list of events per ``create`` call.
        self._scripted = scripted
        self.calls: list[dict[str, Any]] = []

    async def create(self, **kwargs: Any) -> _FakeAsyncStream:
        self.calls.append(copy.deepcopy(kwargs))
        events = self._scripted[len(self.calls) - 1]
        return _FakeAsyncStream(events)


class _FakeClient:
    def __init__(self, scripted: List[List[Any]]) -> None:
        self.aio = SimpleNamespace(interactions=_FakeInteractions(scripted))


def _tools() -> list[dict[str, Any]]:
    return serialize_gemini_tools(
        [
            CanonicalToolDefinition(
                name="create_file",
                description="Create a file.",
                parameters={
                    "type": "object",
                    "properties": {
                        "path": {"type": "string"},
                        "content": {"type": "string"},
                    },
                    "required": ["path", "content"],
                },
            )
        ]
    )


def _interaction_start(interaction_id: str) -> SimpleNamespace:
    return SimpleNamespace(
        event_type="interaction.start",
        interaction=SimpleNamespace(id=interaction_id),
    )


def _interaction_complete(
    interaction_id: str,
    status: str = "completed",
    usage: Any = None,
) -> SimpleNamespace:
    return SimpleNamespace(
        event_type="interaction.complete",
        interaction=SimpleNamespace(id=interaction_id, status=status, usage=usage),
    )


def _usage(prompt: int, candidates: int, thoughts: int, total: int) -> SimpleNamespace:
    return SimpleNamespace(
        total_input_tokens=prompt,
        total_output_tokens=candidates,
        total_thought_tokens=thoughts,
        total_cached_tokens=0,
        total_tokens=total,
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_first_turn_request_shape() -> None:
    client = _FakeClient([[_interaction_start("v1_a"), _interaction_complete("v1_a")]])
    session = GeminiProviderSession(
        client=client,  # type: ignore[arg-type]
        model=Llm.GEMINI_3_5_FLASH_HIGH,
        prompt_messages=[
            {"role": "system", "content": "You are a builder."},
            {"role": "user", "content": "Build a landing page."},
        ],
        tools=_tools(),
    )

    events: list[StreamEvent] = []

    async def sink(e: StreamEvent) -> None:
        events.append(e)

    await session.stream_turn(sink)

    call = client.aio.interactions.calls[0]  # type: ignore[attr-defined]
    assert call["model"] == "gemini-3.5-flash"
    assert call["system_instruction"] == "You are a builder."
    assert call["stream"] is True
    assert call["generation_config"]["thinking_level"] == "high"
    assert call["generation_config"]["thinking_summaries"] == "auto"
    assert "previous_interaction_id" not in call
    # System prompt becomes system_instruction; only the user turn is sent.
    assert call["input"] == [
        {"role": "user", "content": [{"type": "text", "text": "Build a landing page."}]}
    ]


@pytest.mark.asyncio
async def test_streams_text_and_thinking_deltas() -> None:
    events = [
        _interaction_start("v1_b"),
        SimpleNamespace(
            event_type="content.delta",
            index=0,
            delta=SimpleNamespace(
                type="thought_summary",
                content=SimpleNamespace(type="text", text="Planning..."),
            ),
        ),
        SimpleNamespace(
            event_type="content.delta",
            index=1,
            delta=SimpleNamespace(type="text", text="Hello "),
        ),
        SimpleNamespace(
            event_type="content.delta",
            index=1,
            delta=SimpleNamespace(type="text", text="world"),
        ),
        _interaction_complete("v1_b"),
    ]
    client = _FakeClient([events])
    session = GeminiProviderSession(
        client=client,  # type: ignore[arg-type]
        model=Llm.GEMINI_3_5_FLASH_LOW,
        prompt_messages=[
            {"role": "system", "content": "sys"},
            {"role": "user", "content": "hi"},
        ],
        tools=_tools(),
    )

    seen: list[StreamEvent] = []

    async def sink(e: StreamEvent) -> None:
        seen.append(e)

    turn = await session.stream_turn(sink)

    assert turn.assistant_text == "Hello world"
    assert turn.tool_calls == []
    thinking = [e.text for e in seen if e.type == "thinking_delta"]
    assistant = [e.text for e in seen if e.type == "assistant_delta"]
    assert thinking == ["Planning..."]
    assert assistant == ["Hello ", "world"]


@pytest.mark.asyncio
async def test_streams_incremental_tool_call_arguments() -> None:
    """Function-call argument snapshots should stream as growing deltas."""
    events = [
        _interaction_start("v1_c"),
        SimpleNamespace(
            event_type="content.start",
            index=0,
            content=SimpleNamespace(
                type="function_call", id="call-1", name="create_file", arguments={}
            ),
        ),
        SimpleNamespace(
            event_type="content.delta",
            index=0,
            delta=SimpleNamespace(
                type="function_call",
                id="call-1",
                name="create_file",
                arguments={"path": "index.html", "content": "<html>"},
            ),
        ),
        SimpleNamespace(
            event_type="content.delta",
            index=0,
            delta=SimpleNamespace(
                type="function_call",
                id="call-1",
                name="create_file",
                arguments={"path": "index.html", "content": "<html><body>Hi"},
            ),
        ),
        SimpleNamespace(event_type="content.stop", index=0),
        _interaction_complete("v1_c", usage=_usage(10, 20, 5, 35)),
    ]
    client = _FakeClient([events])
    session = GeminiProviderSession(
        client=client,  # type: ignore[arg-type]
        model=Llm.GEMINI_3_5_FLASH_HIGH,
        prompt_messages=[
            {"role": "system", "content": "sys"},
            {"role": "user", "content": "build"},
        ],
        tools=_tools(),
    )

    deltas: list[Any] = []

    async def sink(e: StreamEvent) -> None:
        if e.type == "tool_call_delta":
            deltas.append(e.tool_arguments)

    turn = await session.stream_turn(sink)

    # The growing content snapshots are streamed to the engine.
    assert [d.get("content") for d in deltas] == ["<html>", "<html><body>Hi"]
    # The finalized tool call carries the complete arguments.
    assert len(turn.tool_calls) == 1
    assert turn.tool_calls[0].id == "call-1"
    assert turn.tool_calls[0].name == "create_file"
    assert turn.tool_calls[0].arguments == {
        "path": "index.html",
        "content": "<html><body>Hi",
    }


@pytest.mark.asyncio
async def test_multi_turn_uses_previous_interaction_id_and_function_results() -> None:
    turn1 = [
        _interaction_start("v1_first"),
        SimpleNamespace(
            event_type="content.start",
            index=0,
            content=SimpleNamespace(
                type="function_call", id="call-1", name="create_file", arguments={}
            ),
        ),
        SimpleNamespace(
            event_type="content.delta",
            index=0,
            delta=SimpleNamespace(
                type="function_call",
                id="call-1",
                name="create_file",
                arguments={"path": "index.html", "content": "<html>"},
            ),
        ),
        SimpleNamespace(event_type="content.stop", index=0),
        _interaction_complete("v1_first", status="requires_action"),
    ]
    turn2 = [
        _interaction_start("v1_second"),
        SimpleNamespace(
            event_type="content.delta",
            index=0,
            delta=SimpleNamespace(type="text", text="Done."),
        ),
        _interaction_complete("v1_second"),
    ]
    client = _FakeClient([turn1, turn2])
    session = GeminiProviderSession(
        client=client,  # type: ignore[arg-type]
        model=Llm.GEMINI_3_5_FLASH_HIGH,
        prompt_messages=[
            {"role": "system", "content": "sys"},
            {"role": "user", "content": "build"},
        ],
        tools=_tools(),
    )

    async def sink(_: StreamEvent) -> None:
        return None

    first_turn = await session.stream_turn(sink)
    session.append_tool_results(
        first_turn,
        [
            ExecutedToolCall(
                tool_call=ToolCall(
                    id="call-1",
                    name="create_file",
                    arguments={"path": "index.html", "content": "<html>"},
                ),
                result=ToolExecutionResult(
                    ok=True,
                    result={"content": "Created index.html"},
                    summary={"content": "Created index.html"},
                ),
            )
        ],
    )
    second_turn = await session.stream_turn(sink)

    calls = client.aio.interactions.calls  # type: ignore[attr-defined]
    assert "previous_interaction_id" not in calls[0]
    assert calls[1]["previous_interaction_id"] == "v1_first"
    # Second turn input is just the function result block.
    assert calls[1]["input"] == [
        {
            "type": "function_result",
            "call_id": "call-1",
            "name": "create_file",
            "result": {"content": "Created index.html"},
        }
    ]
    assert second_turn.assistant_text == "Done."


@pytest.mark.asyncio
async def test_error_event_raises() -> None:
    events = [
        _interaction_start("v1_e"),
        SimpleNamespace(
            event_type="error",
            error=SimpleNamespace(message="Deadline expired", code="gateway_timeout"),
        ),
    ]
    client = _FakeClient([events])
    session = GeminiProviderSession(
        client=client,  # type: ignore[arg-type]
        model=Llm.GEMINI_3_5_FLASH_HIGH,
        prompt_messages=[
            {"role": "system", "content": "sys"},
            {"role": "user", "content": "build"},
        ],
        tools=_tools(),
    )

    async def sink(_: StreamEvent) -> None:
        return None

    with pytest.raises(RuntimeError, match="Deadline expired"):
        await session.stream_turn(sink)


@pytest.mark.asyncio
async def test_unknown_events_are_ignored() -> None:
    events = [
        _interaction_start("v1_u"),
        SimpleNamespace(event_type="interaction.status_update", status="in_progress"),
        SimpleNamespace(event_type="some.future.event", payload="ignored"),
        SimpleNamespace(
            event_type="content.delta",
            index=0,
            delta=SimpleNamespace(type="some_future_delta", value=1),
        ),
        SimpleNamespace(
            event_type="content.delta",
            index=0,
            delta=SimpleNamespace(type="text", text="ok"),
        ),
        _interaction_complete("v1_u"),
    ]
    client = _FakeClient([events])
    session = GeminiProviderSession(
        client=client,  # type: ignore[arg-type]
        model=Llm.GEMINI_3_5_FLASH_HIGH,
        prompt_messages=[
            {"role": "system", "content": "sys"},
            {"role": "user", "content": "build"},
        ],
        tools=_tools(),
    )

    async def sink(_: StreamEvent) -> None:
        return None

    turn = await session.stream_turn(sink)
    assert turn.assistant_text == "ok"
