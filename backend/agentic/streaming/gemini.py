# pyright: reportUnknownVariableType=false
import uuid
from typing import Any, Dict, List, cast

from google import genai
from google.genai import types
from openai.types.chat import ChatCompletionMessageParam

from agentic.streaming.types import EventSink, ExecutedToolCall, StepResult, StreamEvent
from agentic.tools import ToolCall
from llm import Llm
from agentic.streaming.providers.gemini.transform import (
    convert_message_to_gemini_content,
    get_gemini_api_model_name,
    get_thinking_level_for_model,
)


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
        assistant_text = ""
        tool_calls: List[ToolCall] = []
        function_call_parts: List[types.Part] = []

        thinking_level = get_thinking_level_for_model(self._model)
        config = types.GenerateContentConfig(
            temperature=0,
            max_output_tokens=30000,
            system_instruction=self._system_prompt,
            thinking_config=types.ThinkingConfig(
                thinking_level=cast(Any, thinking_level),
                include_thoughts=True,
            ),
            tools=self._tools,
        )

        api_model_name = get_gemini_api_model_name(self._model)

        async for chunk in await self._client.aio.models.generate_content_stream(
            model=api_model_name,
            contents=cast(Any, self._contents),
            config=config,
        ):
            if not chunk.candidates:
                continue

            candidate_content = chunk.candidates[0].content
            if not candidate_content or not candidate_content.parts:
                continue

            for part in candidate_content.parts:
                if getattr(part, "thought", False) and part.text:
                    await on_event(StreamEvent(type="thinking_delta", text=part.text))
                    continue

                if part.function_call:
                    function_call_parts.append(part)
                    args = part.function_call.args or {}
                    tool_id = part.function_call.id or f"tool-{uuid.uuid4().hex[:6]}"
                    tool_name = part.function_call.name or "unknown_tool"

                    await on_event(
                        StreamEvent(
                            type="tool_call_delta",
                            tool_call_id=tool_id,
                            tool_name=tool_name,
                            tool_arguments=args,
                        )
                    )

                    tool_calls.append(
                        ToolCall(
                            id=tool_id,
                            name=tool_name,
                            arguments=args,
                        )
                    )
                    continue

                if part.text:
                    assistant_text += part.text
                    await on_event(StreamEvent(type="assistant_delta", text=part.text))

        return StepResult(
            assistant_text=assistant_text,
            tool_calls=tool_calls,
            provider_state={"function_call_parts": function_call_parts},
        )

    def apply_tool_results(
        self,
        step_result: StepResult,
        executed_tool_calls: list[ExecutedToolCall],
    ) -> None:
        function_call_parts = cast(
            List[types.Part],
            ((step_result.provider_state or {}).get("function_call_parts") or []),
        )

        model_parts: List[Any] = []
        if step_result.assistant_text:
            model_parts.append({"text": step_result.assistant_text})  # type: ignore
        model_parts.extend(function_call_parts)

        self._contents.append(types.Content(role="model", parts=model_parts))

        tool_result_parts: List[types.Part] = []
        for executed in executed_tool_calls:
            tool_result_parts.append(
                types.Part.from_function_response(
                    name=executed.tool_call.name,
                    response=executed.result.result,
                )
            )

        self._contents.append(types.Content(role="tool", parts=tool_result_parts))
