# pyright: reportUnknownVariableType=false
import base64
import copy
import json
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, cast

from anthropic import AsyncAnthropic
from openai.types.chat import ChatCompletionMessageParam

from agent.providers.base import (
    EventSink,
    ExecutedToolCall,
    ProviderSession,
    ProviderTurn,
    StreamEvent,
)
from agent.providers.anthropic.image import process_image
from agent.providers.pricing import MODEL_PRICING
from agent.providers.token_usage import TokenUsage
from agent.tools import CanonicalToolDefinition, ToolCall, parse_json_arguments
from fs_logging.prompt_reports import PromptReportLogger
from llm import Llm

THINKING_MODELS: set[str] = set()
ADAPTIVE_THINKING_MODELS = {
    Llm.CLAUDE_OPUS_4_8_LOW.value,
    Llm.CLAUDE_OPUS_4_8_MEDIUM.value,
    Llm.CLAUDE_OPUS_4_8_HIGH.value,
    Llm.CLAUDE_OPUS_4_8_XHIGH.value,
    Llm.CLAUDE_OPUS_4_8_MAX.value,
    Llm.CLAUDE_FABLE_5_LOW.value,
    Llm.CLAUDE_FABLE_5_MEDIUM.value,
    Llm.CLAUDE_FABLE_5_HIGH.value,
    Llm.CLAUDE_FABLE_5_XHIGH.value,
    Llm.CLAUDE_FABLE_5_MAX.value,
    Llm.CLAUDE_SONNET_4_6.value,
}

ANTHROPIC_MODEL_CONFIG: dict[Llm, dict[str, str]] = {
    Llm.CLAUDE_OPUS_4_8_LOW: {"api_name": "claude-opus-4-8", "effort": "low"},
    Llm.CLAUDE_OPUS_4_8_MEDIUM: {"api_name": "claude-opus-4-8", "effort": "medium"},
    Llm.CLAUDE_OPUS_4_8_HIGH: {"api_name": "claude-opus-4-8", "effort": "high"},
    Llm.CLAUDE_OPUS_4_8_XHIGH: {"api_name": "claude-opus-4-8", "effort": "xhigh"},
    Llm.CLAUDE_OPUS_4_8_MAX: {"api_name": "claude-opus-4-8", "effort": "max"},
    Llm.CLAUDE_FABLE_5_LOW: {"api_name": "claude-fable-5", "effort": "low"},
    Llm.CLAUDE_FABLE_5_MEDIUM: {"api_name": "claude-fable-5", "effort": "medium"},
    Llm.CLAUDE_FABLE_5_HIGH: {"api_name": "claude-fable-5", "effort": "high"},
    Llm.CLAUDE_FABLE_5_XHIGH: {"api_name": "claude-fable-5", "effort": "xhigh"},
    Llm.CLAUDE_FABLE_5_MAX: {"api_name": "claude-fable-5", "effort": "max"},
}


def _get_anthropic_api_model_name(model: Llm) -> str:
    return ANTHROPIC_MODEL_CONFIG.get(model, {}).get("api_name", model.value)


def _get_anthropic_effort(model: Llm) -> str:
    configured_effort = ANTHROPIC_MODEL_CONFIG.get(model, {}).get("effort")
    if configured_effort:
        return configured_effort
    if model == Llm.CLAUDE_SONNET_4_6:
        return "high"
    return "max"


def _convert_openai_messages_to_claude(
    messages: List[ChatCompletionMessageParam],
) -> tuple[str, List[Dict[str, Any]]]:
    cloned_messages = copy.deepcopy(messages)

    system_prompt = cast(str, cloned_messages[0].get("content"))
    claude_messages = [dict(message) for message in cloned_messages[1:]]

    for message in claude_messages:
        if not isinstance(message["content"], list):
            continue

        for content in message["content"]:  # type: ignore
            if content["type"] != "image_url":
                continue

            content["type"] = "image"
            image_data_url = cast(str, content["image_url"]["url"])
            media_type, base64_data = process_image(image_data_url)
            del content["image_url"]
            content["source"] = {
                "type": "base64",
                "media_type": media_type,
                "data": base64_data,
            }

    return system_prompt, claude_messages


def serialize_anthropic_tools(
    tools: List[CanonicalToolDefinition],
) -> List[Dict[str, Any]]:
    return [
        {
            "name": tool.name,
            "description": tool.description,
            "eager_input_streaming": True,
            "input_schema": copy.deepcopy(tool.parameters),
        }
        for tool in tools
    ]


@dataclass
class AnthropicParseState:
    assistant_text: str = ""
    tool_blocks: Dict[int, Dict[str, Any]] = field(default_factory=dict)
    tool_json_buffers: Dict[int, str] = field(default_factory=dict)


async def _parse_stream_event(
    event: Any,
    state: AnthropicParseState,
    on_event: EventSink,
) -> None:
    if event.type == "content_block_start":
        block = event.content_block
        if getattr(block, "type", None) != "tool_use":
            return

        tool_id = getattr(block, "id", None) or f"tool-{uuid.uuid4().hex[:6]}"
        tool_name = getattr(block, "name", None) or "unknown_tool"
        args = getattr(block, "input", None)
        state.tool_blocks[event.index] = {
            "id": tool_id,
            "name": tool_name,
        }
        state.tool_json_buffers[event.index] = ""
        if args:
            await on_event(
                StreamEvent(
                    type="tool_call_delta",
                    tool_call_id=tool_id,
                    tool_name=tool_name,
                    tool_arguments=args,
                )
            )
        return

    if event.type != "content_block_delta":
        return

    if event.delta.type == "thinking_delta":
        await on_event(StreamEvent(type="thinking_delta", text=event.delta.thinking))
        return

    if event.delta.type == "text_delta":
        state.assistant_text += event.delta.text
        await on_event(StreamEvent(type="assistant_delta", text=event.delta.text))
        return

    if event.delta.type != "input_json_delta":
        return

    partial_json = getattr(event.delta, "partial_json", None) or ""
    if not partial_json:
        return

    buffer = state.tool_json_buffers.get(event.index, "") + partial_json
    state.tool_json_buffers[event.index] = buffer
    meta = state.tool_blocks.get(event.index)
    if not meta:
        return

    await on_event(
        StreamEvent(
            type="tool_call_delta",
            tool_call_id=meta.get("id"),
            tool_name=meta.get("name"),
            tool_arguments=buffer,
        )
    )


def _extract_tool_calls(final_message: Any) -> List[ToolCall]:
    tool_calls: List[ToolCall] = []
    if final_message and final_message.content:
        for block in final_message.content:
            if block.type != "tool_use":
                continue
            raw_input = getattr(block, "input", {})
            args: Dict[str, Any]
            if isinstance(raw_input, dict):
                args = cast(Dict[str, Any], raw_input)
            else:
                parsed, error = parse_json_arguments(raw_input)
                if error:
                    args = {"INVALID_JSON": str(raw_input)}
                else:
                    args = parsed
            tool_calls.append(
                ToolCall(
                    id=block.id,
                    name=block.name,
                    arguments=args,
                )
            )
    return tool_calls


def _extract_anthropic_usage(final_message: Any) -> TokenUsage:
    """Extract unified token usage from an Anthropic final message.

    Anthropic includes thinking tokens in ``output_tokens`` so no extra
    addition is needed.  ``total`` is computed since the API doesn't provide it.
    """
    usage = getattr(final_message, "usage", None)
    if usage is None:
        return TokenUsage()
    input_tokens = getattr(usage, "input_tokens", 0) or 0
    output_tokens = getattr(usage, "output_tokens", 0) or 0
    cache_read = getattr(usage, "cache_read_input_tokens", 0) or 0
    cache_write = getattr(usage, "cache_creation_input_tokens", 0) or 0
    return TokenUsage(
        input=input_tokens,
        output=output_tokens,
        cache_read=cache_read,
        cache_write=cache_write,
        total=input_tokens + output_tokens + cache_read + cache_write,
    )


class AnthropicProviderSession(ProviderSession):
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
        self._total_usage = TokenUsage()
        self._prompt_report_logger = PromptReportLogger(
            provider="anthropic",
            model=model,
            api_model_name=_get_anthropic_api_model_name(model),
        )
        system_prompt, claude_messages = _convert_openai_messages_to_claude(prompt_messages)
        self._system_prompt = system_prompt
        self._messages = claude_messages

    async def stream_turn(self, on_event: EventSink) -> ProviderTurn:
        stream_kwargs: Dict[str, Any] = {
            "model": _get_anthropic_api_model_name(self._model),
            "max_tokens": 50000,
            "system": self._system_prompt,
            "messages": self._messages,
            "tools": self._tools,
            "cache_control": {"type": "ephemeral"},
        }

        if self._model.value in ADAPTIVE_THINKING_MODELS:
            stream_kwargs["thinking"] = {
                "type": "adaptive",
            }
            stream_kwargs["output_config"] = {
                "effort": _get_anthropic_effort(self._model)
            }
        elif self._model.value in THINKING_MODELS:
            stream_kwargs["thinking"] = {
                "type": "enabled",
                "budget_tokens": 10000,
            }
        else:
            stream_kwargs["temperature"] = 0.0

        self._prompt_report_logger.record_request(stream_kwargs)

        state = AnthropicParseState()
        async with self._client.messages.stream(**stream_kwargs) as stream:
            async for event in stream:
                await _parse_stream_event(event, state, on_event)
            final_message = await stream.get_final_message()

        turn_usage = _extract_anthropic_usage(final_message)
        self._prompt_report_logger.record_usage(turn_usage)
        self._total_usage.accumulate(turn_usage)

        tool_calls = _extract_tool_calls(final_message)
        return ProviderTurn(
            assistant_text=state.assistant_text,
            tool_calls=tool_calls,
            assistant_turn=final_message,
        )

    @staticmethod
    def _image_block(part: Any) -> Dict[str, Any] | None:
        """A public URL goes as a url source; local bytes go as base64."""
        if part.image_url:
            return {
                "type": "image",
                "source": {"type": "url", "url": part.image_url},
            }
        if part.data is not None:
            return {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": part.mime_type,
                    "data": base64.b64encode(part.data).decode("ascii"),
                },
            }
        return None

    async def append_tool_results(
        self,
        turn: ProviderTurn,
        executed_tool_calls: list[ExecutedToolCall],
    ) -> None:
        assistant_blocks: List[Dict[str, Any]] = []
        if turn.assistant_text:
            assistant_blocks.append({"type": "text", "text": turn.assistant_text})

        for call in turn.tool_calls:
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
            result_json = json.dumps(executed.result.result)
            is_error = not executed.result.ok
            parts = executed.result.multimodal_parts or []
            content: str | List[Dict[str, Any]]
            # The API rejects non-text tool_result content when is_error is
            # true, so failed calls fall back to a plain text result.
            if parts and not is_error:
                content = [{"type": "text", "text": result_json}]
                for part in parts:
                    block = self._image_block(part)
                    if block is None:
                        continue
                    content.append({"type": "text", "text": part.display_name})
                    content.append(block)
            else:
                content = result_json
            tool_result_blocks.append(
                {
                    "type": "tool_result",
                    "tool_use_id": executed.tool_call.id,
                    "content": content,
                    "is_error": is_error,
                }
            )

        self._messages.append({"role": "user", "content": tool_result_blocks})

    def get_total_usage(self) -> TokenUsage:
        usage = self._total_usage
        return TokenUsage(
            input=usage.input,
            output=usage.output,
            cache_read=usage.cache_read,
            cache_write=usage.cache_write,
            total=usage.total,
        )

    def get_total_cost_usd(self) -> float:
        usage = self._total_usage
        model_name = self._model.value
        pricing = MODEL_PRICING.get(model_name)
        return usage.cost(pricing) if pricing else 0.0

    async def close(self) -> None:
        u = self._total_usage
        model_name = self._model.value
        pricing = MODEL_PRICING.get(_get_anthropic_api_model_name(self._model))
        cost_str = f" cost=${u.cost(pricing):.4f}" if pricing else ""
        cache_hit_rate_str = f" cache_hit_rate={u.cache_hit_rate_percent():.2f}%"
        print(
            f"[TOKEN USAGE] provider=anthropic model={model_name} | "
            f"input={u.input} output={u.output} "
            f"cache_read={u.cache_read} cache_write={u.cache_write} "
            f"total={u.total}{cache_hit_rate_str}{cost_str}"
        )
        await self._client.close()
