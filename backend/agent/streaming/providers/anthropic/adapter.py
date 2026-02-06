import json
from typing import Any, Dict, List

from anthropic import AsyncAnthropic
from openai.types.chat import ChatCompletionMessageParam

from agent.streaming.providers.anthropic.parser import (
    AnthropicParseState,
    extract_tool_calls,
    parse_stream_event,
)
from agent.streaming.providers.anthropic.stream import create_stream_context
from agent.streaming.providers.anthropic.transform import (
    convert_openai_messages_to_claude,
)
from agent.streaming.types import EventSink, ExecutedToolCall, StepResult
from llm import Llm


class AnthropicAdapter:
    def __init__(
        self,
        client: AsyncAnthropic,
        model: Llm,
        prompt_messages: List[ChatCompletionMessageParam],
        tools: List[Dict[str, Any]],
    ):
        self._client = client
        self._model = model
        self._tools = tools
        system_prompt, claude_messages = convert_openai_messages_to_claude(prompt_messages)
        self._system_prompt = system_prompt
        self._messages = claude_messages

    async def run_step(self, on_event: EventSink) -> StepResult:
        state = AnthropicParseState()
        stream_ctx = create_stream_context(
            client=self._client,
            model=self._model,
            system_prompt=self._system_prompt,
            messages=self._messages,
            tools=self._tools,
        )

        async with stream_ctx as stream:
            async for event in stream:
                await parse_stream_event(event, state, on_event)
            final_message = await stream.get_final_message()

        tool_calls = extract_tool_calls(final_message)
        return StepResult(assistant_text=state.assistant_text, tool_calls=tool_calls)

    def apply_tool_results(
        self,
        step_result: StepResult,
        executed_tool_calls: list[ExecutedToolCall],
    ) -> None:
        assistant_blocks: List[Dict[str, Any]] = []
        if step_result.assistant_text:
            assistant_blocks.append({"type": "text", "text": step_result.assistant_text})

        for call in step_result.tool_calls:
            assistant_blocks.append(
                {
                    "type": "tool_use",
                    "id": call.id,
                    "name": call.name,
                    "input": call.arguments,
                }
            )

        self._messages.append({"role": "assistant", "content": assistant_blocks})

        tool_result_blocks: List[Dict[str, Any]] = []
        for executed in executed_tool_calls:
            tool_result_blocks.append(
                {
                    "type": "tool_result",
                    "tool_use_id": executed.tool_call.id,
                    "content": json.dumps(executed.result.result),
                    "is_error": not executed.result.ok,
                }
            )

        self._messages.append({"role": "user", "content": tool_result_blocks})
