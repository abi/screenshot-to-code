# pyright: reportUnknownVariableType=false
import json
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam

from agent.providers.base import (
    EventSink,
    ExecutedToolCall,
    ProviderSession,
    ProviderTurn,
    StreamEvent,
)
from costs.pricing import MODEL_PRICING
from costs.token_usage import TokenUsage
from agent.tools import CanonicalToolDefinition, ToolCall, parse_json_arguments
from fs_logging.agent_runs import AgentRunRecorder
from fs_logging.prompt_reports import PromptReportLogger
from llm import Llm

NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"

# Map variant enum members to the actual API model name.
_NVIDIA_MODEL_NAMES: Dict[Llm, str] = {
    Llm.NVIDIA_NEMOTRON_3_5_FLASH: "nvidia/nemotron-3.5-lightning-30b-a3b",
    Llm.NVIDIA_NEMOTRON_3_5_FLASH_LOW: "nvidia/nemotron-3.5-lightning-30b-a3b",
    Llm.NVIDIA_NEMOTRON_3_5_FLASH_MEDIUM: "nvidia/nemotron-3.5-lightning-30b-a3b",
    Llm.NVIDIA_NEMOTRON_3_5_FLASH_HIGH: "nvidia/nemotron-3.5-lightning-30b-a3b",
}


def _get_nvidia_api_name(model: Llm) -> str:
    return _NVIDIA_MODEL_NAMES.get(model, "nvidia/nemotron-3.5-lightning-30b-a3b")


def serialize_nvidia_tools(
    tools: List[CanonicalToolDefinition],
) -> List[Dict[str, Any]]:
    """Serialize canonical tools to OpenAI chat-completions function format.

    NVIDIA NIM exposes an OpenAI-compatible ``/chat/completions`` endpoint, so
    the tool schema follows the standard ``function`` layout (no ``strict``
    flag which is Responses-API-specific).

    Only include code-generation tools (create_file / edit_file).  Image and
    asset tools are excluded because Nemotron 3.5 Flash is text-only and
    NVIDIA's guardrails may reject unrelated function definitions.
    """
    _NVIDIA_ALLOWED_TOOLS = {"create_file", "edit_file"}
    serialized: List[Dict[str, Any]] = []
    for tool in tools:
        if tool.name not in _NVIDIA_ALLOWED_TOOLS:
            continue
        serialized.append(
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.parameters,
                },
            }
        )
    return serialized


# ---------------------------------------------------------------------------
# Streaming parse state
# ---------------------------------------------------------------------------

@dataclass
class _NvidiaParseState:
    """Accumulates streaming deltas for a single chat-completions turn."""

    assistant_text: str = ""
    thinking_text: str = ""
    tool_calls: Dict[int, Dict[str, Any]] = field(default_factory=dict)
    turn_usage: TokenUsage | None = None


def _extract_usage(chunk: Any) -> TokenUsage | None:
    usage = getattr(chunk, "usage", None)
    if usage is None:
        return None
    return TokenUsage(
        input=getattr(usage, "prompt_tokens", 0) or 0,
        output=getattr(usage, "completion_tokens", 0) or 0,
    )


def _parse_chunk(chunk: Any, state: _NvidiaParseState, on_event: EventSink) -> None:
    """Process a single streaming chunk from chat.completions.create(stream=True)."""
    choices = getattr(chunk, "choices", None)
    if not choices:
        # Last chunk may carry only usage
        usage = _extract_usage(chunk)
        if usage is not None:
            state.turn_usage = usage
        return

    delta = getattr(choices[0], "delta", None)
    if delta is None:
        return

    # Thinking/reasoning content (Nemotron streams this separately)
    reasoning = getattr(delta, "reasoning_content", None)
    if reasoning:
        state.thinking_text += reasoning
        return  # Don't mix reasoning with assistant content

    # Text content
    content = getattr(delta, "content", None)
    if content:
        state.assistant_text += content

    # Tool-call deltas (streamed incrementally)
    raw_tool_calls = getattr(delta, "tool_calls", None)
    if raw_tool_calls:
        for tc in raw_tool_calls:
            idx = tc.index
            if idx not in state.tool_calls:
                state.tool_calls[idx] = {
                    "id": tc.id or f"call-{uuid.uuid4().hex[:6]}",
                    "name": "",
                    "arguments": "",
                }
            entry = state.tool_calls[idx]
            if tc.id:
                entry["id"] = tc.id
            fn = getattr(tc, "function", None)
            if fn:
                if getattr(fn, "name", None):
                    entry["name"] = fn.name
                if getattr(fn, "arguments", None):
                    entry["arguments"] += fn.arguments

    # Usage on final chunk
    usage = _extract_usage(chunk)
    if usage is not None:
        state.turn_usage = usage


def _build_provider_turn(state: _NvidiaParseState) -> ProviderTurn:
    tool_calls: List[ToolCall] = []
    for _idx in sorted(state.tool_calls):
        entry = state.tool_calls[_idx]
        try:
            args = json.loads(entry["arguments"])
        except (json.JSONDecodeError, TypeError):
            args = {"INVALID_JSON": entry["arguments"]}
        tool_calls.append(
            ToolCall(
                id=entry["id"],
                name=entry["name"] or "unknown_tool",
                arguments=args,
            )
        )

    return ProviderTurn(
        assistant_text=state.assistant_text,
        tool_calls=tool_calls,
        assistant_turn=None,
    )


# ---------------------------------------------------------------------------
# Provider session
# ---------------------------------------------------------------------------

def _strip_images(messages: List[ChatCompletionMessageParam]) -> List[Dict[str, Any]]:
    """Strip image content from messages. Nemotron 3.5 Flash is text-only."""
    cleaned: List[Dict[str, Any]] = []
    for i, msg in enumerate(messages):
        role = msg.get("role")  # type: ignore
        content = msg.get("content")  # type: ignore
        if isinstance(content, list):
            text_parts = []
            had_images = False
            for part in content:
                if isinstance(part, dict) and part.get("type") == "text":
                    text_parts.append(part.get("text", ""))
                elif isinstance(part, dict) and part.get("type") == "image_url":
                    had_images = True
            combined = " ".join(text_parts) if text_parts else ""
            if had_images:
                combined += "\n\n[Note: A screenshot/image was provided but NVIDIA Nemotron does not support images. Reproduce the UI from the text description above.]"
            cleaned.append({"role": role, "content": combined or None})
        else:
            cleaned.append({"role": role, "content": content})
    return cleaned


class NvidiaProviderSession(ProviderSession):
    def __init__(
        self,
        client: AsyncOpenAI,
        model: Llm,
        prompt_messages: List[ChatCompletionMessageParam],
        tools: List[Dict[str, Any]],
        recorder: Optional[AgentRunRecorder] = None,
    ):
        self._client = client
        self._model = model
        self._tools = tools
        self._prompt_messages = _strip_images(list(prompt_messages))
        self._total_usage = TokenUsage()
        self._recorder = recorder
        self._prompt_report_logger = PromptReportLogger(
            provider="nvidia",
            model=model,
            api_model_name=_get_nvidia_api_name(model),
        )

    async def stream_turn(self, on_event: EventSink) -> ProviderTurn:
        model_name = _get_nvidia_api_name(self._model)
        params: Dict[str, Any] = {
            "model": model_name,
            "messages": self._prompt_messages,
            "stream": True,
            "stream_options": {"include_usage": True},
            "max_tokens": 8192,
            "temperature": 0.4,
            "tool_choice": "required",
        }
        if self._tools:
            params["tools"] = self._tools
        else:
            params.pop("tool_choice", None)

        self._prompt_report_logger.record_request(params)
        if self._recorder is not None:
            self._recorder.record_llm_request("nvidia", model_name, params)

        state = _NvidiaParseState()
        stream = await self._client.chat.completions.create(**params)  # type: ignore
        async for chunk in stream:  # type: ignore
            _parse_chunk(chunk, state, on_event)

        if state.turn_usage is not None:
            self._prompt_report_logger.record_usage(state.turn_usage)
            self._total_usage.accumulate(state.turn_usage)

        turn = _build_provider_turn(state)
        if self._recorder is not None:
            self._recorder.record_llm_response(
                turn.assistant_text, turn.tool_calls, state.turn_usage
            )
        return turn

    def total_cost_usd(self) -> float | None:
        pricing = MODEL_PRICING.get(_get_nvidia_api_name(self._model))
        if pricing is None:
            return None
        return self._total_usage.cost(pricing)

    async def append_tool_results(
        self,
        turn: ProviderTurn,
        executed_tool_calls: list[ExecutedToolCall],
    ) -> None:
        # Append the assistant message with tool calls
        assistant_msg: Dict[str, Any] = {"role": "assistant", "content": turn.assistant_text or None}
        if turn.tool_calls:
            assistant_msg["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.name,
                        "arguments": json.dumps(tc.arguments),
                    },
                }
                for tc in turn.tool_calls
            ]
        self._prompt_messages.append(assistant_msg)

        # Append each tool result as a tool message
        for executed in executed_tool_calls:
            result_json = json.dumps(executed.result.result)
            self._prompt_messages.append(
                {
                    "role": "tool",
                    "tool_call_id": executed.tool_call.id,
                    "content": result_json,
                }
            )

    async def close(self) -> None:
        u = self._total_usage
        model_name = _get_nvidia_api_name(self._model)
        pricing = MODEL_PRICING.get(model_name)
        cost_str = f" cost=${u.cost(pricing):.4f}" if pricing else ""
        print(
            f"[TOKEN USAGE] provider=nvidia model={model_name} | "
            f"input={u.input} output={u.output} "
            f"total={u.total}{cost_str}"
        )
        await self._client.close()
