# pyright: reportUnknownVariableType=false
from typing import List

from google import genai
from google.genai import types
from openai.types.chat import ChatCompletionMessageParam

from agent.providers.gemini.parser import (
    GeminiParseState,
    build_step_result,
    parse_chunk,
)
from agent.providers.gemini.stream import (
    create_generate_config,
    create_stream,
)
from agent.providers.gemini.transform import convert_message_to_gemini_content
from agent.providers.types import EventSink, ExecutedToolCall, StepResult
from llm import Llm


class GeminiAdapter:
    def __init__(
        self,
        client: genai.Client,
        model: Llm,
        prompt_messages: List[ChatCompletionMessageParam],
        tools: List[types.Tool],
    ):
        self._client = client
        self._model = model
        self._tools = tools

        self._system_prompt = str(prompt_messages[0].get("content", ""))
        self._contents: List[types.Content] = [
            convert_message_to_gemini_content(msg) for msg in prompt_messages[1:]
        ]

    async def run_step(self, on_event: EventSink) -> StepResult:
        state = GeminiParseState()
        config = create_generate_config(
            model=self._model,
            system_prompt=self._system_prompt,
            tools=self._tools,
        )
        stream = await create_stream(
            client=self._client,
            model=self._model,
            contents=self._contents,
            config=config,
        )

        async for chunk in stream:
            await parse_chunk(chunk, state, on_event)

        return build_step_result(state)

    def apply_tool_results(
        self,
        step_result: StepResult,
        executed_tool_calls: list[ExecutedToolCall],
    ) -> None:
        model_content = (step_result.provider_state or {}).get("model_content")
        if not isinstance(model_content, types.Content) or not model_content.parts:
            raise ValueError(
                "Gemini step is missing model_content. Cannot append tool results without the original model turn."
            )

        self._contents.append(model_content)

        tool_result_parts: List[types.Part] = []
        for executed in executed_tool_calls:
            tool_result_parts.append(
                types.Part.from_function_response(
                    name=executed.tool_call.name,
                    response=executed.result.result,
                )
            )

        self._contents.append(types.Content(role="tool", parts=tool_result_parts))
