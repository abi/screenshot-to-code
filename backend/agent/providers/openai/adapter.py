# pyright: reportUnknownVariableType=false
import json
from typing import Any, Dict, List

from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam

from agent.providers.openai.parser import (
    OpenAIResponsesParseState,
    build_step_result,
    parse_event,
)
from agent.providers.openai.stream import create_responses_stream
from agent.providers.openai.transform import (
    convert_message_to_responses_input,
)
from agent.providers.types import EventSink, ExecutedToolCall, StepResult
from llm import Llm


class OpenAIResponsesAdapter:
    def __init__(
        self,
        client: AsyncOpenAI,
        model: Llm,
        prompt_messages: List[ChatCompletionMessageParam],
        tools: List[Dict[str, Any]],
    ):
        self._client = client
        self._model = model
        self._tools = tools
        self._input_items: List[Dict[str, Any]] = [
            convert_message_to_responses_input(m) for m in prompt_messages
        ]

    async def run_step(self, on_event: EventSink) -> StepResult:
        state = OpenAIResponsesParseState()
        stream = await create_responses_stream(
            client=self._client,
            model=self._model,
            input_items=self._input_items,
            tools=self._tools,
        )
        async for event in stream:  # type: ignore
            await parse_event(event, state, on_event)
        return build_step_result(state)

    def apply_tool_results(
        self,
        step_result: StepResult,
        executed_tool_calls: list[ExecutedToolCall],
    ) -> None:
        provider_state = step_result.provider_state or {}
        output_items = provider_state.get("output_items") or []

        tool_output_items: List[Dict[str, Any]] = []
        for executed in executed_tool_calls:
            tool_output_items.append(
                {
                    "type": "function_call_output",
                    "call_id": executed.tool_call.id,
                    "output": json.dumps(executed.result.result),
                }
            )

        self._input_items.extend(output_items)
        self._input_items.extend(tool_output_items)
