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
async def test_openai_provider_session_reuses_prompt_cache_key_across_turns() -> None:
    client = _FakeOpenAIClient()
    session = OpenAIProviderSession(
        client=client,  # type: ignore[arg-type]
        model=Llm.GPT_5_2_CODEX_HIGH,
        prompt_messages=[{"role": "user", "content": "Build a landing page."}],
        tools=_test_tools(),
    )

    first_turn = await session.stream_turn(_noop_event_sink)
    session.append_tool_results(
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

    assert first_call["prompt_cache_key"] == second_call["prompt_cache_key"]
    assert isinstance(first_call["prompt_cache_key"], str)
    assert str(first_call["prompt_cache_key"]).startswith("s2c-openai-session-v1-")
    assert isinstance(first_input, list)
    assert isinstance(second_input, list)
    assert len(second_input) > len(first_input)


@pytest.mark.asyncio
async def test_openai_provider_session_prompt_cache_key_is_deterministic() -> None:
    first_client = _FakeOpenAIClient()
    second_client = _FakeOpenAIClient()
    different_prompt_client = _FakeOpenAIClient()

    first_session = OpenAIProviderSession(
        client=first_client,  # type: ignore[arg-type]
        model=Llm.GPT_5_2_CODEX_HIGH,
        prompt_messages=[{"role": "user", "content": "Build a landing page."}],
        tools=_test_tools(),
    )
    second_session = OpenAIProviderSession(
        client=second_client,  # type: ignore[arg-type]
        model=Llm.GPT_5_2_CODEX_HIGH,
        prompt_messages=[{"role": "user", "content": "Build a landing page."}],
        tools=_test_tools(),
    )
    different_prompt_session = OpenAIProviderSession(
        client=different_prompt_client,  # type: ignore[arg-type]
        model=Llm.GPT_5_2_CODEX_HIGH,
        prompt_messages=[{"role": "user", "content": "Build a dashboard."}],
        tools=_test_tools(),
    )

    await first_session.stream_turn(_noop_event_sink)
    await second_session.stream_turn(_noop_event_sink)
    await different_prompt_session.stream_turn(_noop_event_sink)

    first_key = first_client.responses.calls[0]["prompt_cache_key"]
    second_key = second_client.responses.calls[0]["prompt_cache_key"]
    different_prompt_key = different_prompt_client.responses.calls[0]["prompt_cache_key"]

    assert first_key == second_key
    assert first_key != different_prompt_key
