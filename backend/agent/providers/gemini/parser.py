import uuid
from dataclasses import dataclass, field
from typing import List

from google.genai import types

from agent.providers.types import EventSink, StepResult, StreamEvent
from agent.tools import ToolCall


@dataclass
class GeminiParseState:
    assistant_text: str = ""
    tool_calls: List[ToolCall] = field(default_factory=list)
    model_parts: List[types.Part] = field(default_factory=list)
    model_role: str = "model"


async def parse_chunk(
    chunk: types.GenerateContentResponse,
    state: GeminiParseState,
    on_event: EventSink,
) -> None:
    if not chunk.candidates:
        return

    candidate_content = chunk.candidates[0].content
    if not candidate_content or not candidate_content.parts:
        return

    if candidate_content.role:
        state.model_role = candidate_content.role

    for part in candidate_content.parts:
        # Preserve each model part as streamed so thought signatures remain
        # attached to their original parts for the next turn.
        state.model_parts.append(part)

        if getattr(part, "thought", False) and part.text:
            await on_event(StreamEvent(type="thinking_delta", text=part.text))
            continue

        if part.function_call:
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

            state.tool_calls.append(
                ToolCall(
                    id=tool_id,
                    name=tool_name,
                    arguments=args,
                )
            )
            continue

        if part.text:
            state.assistant_text += part.text
            await on_event(StreamEvent(type="assistant_delta", text=part.text))


def build_step_result(state: GeminiParseState) -> StepResult:
    model_content = (
        types.Content(role=state.model_role, parts=state.model_parts)
        if state.model_parts
        else None
    )
    return StepResult(
        assistant_text=state.assistant_text,
        tool_calls=state.tool_calls,
        provider_state={"model_content": model_content},
    )
