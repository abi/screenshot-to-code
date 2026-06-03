# pyright: reportUnknownVariableType=false
import base64
import copy
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from google import genai
from openai.types.chat import ChatCompletionMessageParam

from agent.providers.base import (
    EventSink,
    ExecutedToolCall,
    ProviderSession,
    ProviderTurn,
    StreamEvent,
)
from agent.providers.pricing import MODEL_PRICING
from agent.providers.token_usage import TokenUsage
from agent.tools import CanonicalToolDefinition, ToolCall
from config import IS_DEBUG_ENABLED
from fs_logging.gemini_prompt_report import write_gemini_prompt_report
from llm import Llm


def serialize_gemini_tools(
    tools: List[CanonicalToolDefinition],
) -> List[Dict[str, Any]]:
    """Serialize canonical tools into Interactions API ``function`` tool params."""
    return [
        {
            "type": "function",
            "name": tool.name,
            "description": tool.description,
            "parameters": copy.deepcopy(tool.parameters),
        }
        for tool in tools
    ]


def _get_gemini_api_model_name(model: Llm) -> str:
    if model in [
        Llm.GEMINI_3_FLASH_PREVIEW_HIGH,
        Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL,
    ]:
        return "gemini-3-flash-preview"
    if model in [
        Llm.GEMINI_3_5_FLASH_HIGH,
        Llm.GEMINI_3_5_FLASH_MEDIUM,
        Llm.GEMINI_3_5_FLASH_LOW,
        Llm.GEMINI_3_5_FLASH_MINIMAL,
    ]:
        return "gemini-3.5-flash"
    if model in [
        Llm.GEMINI_3_1_PRO_PREVIEW_HIGH,
        Llm.GEMINI_3_1_PRO_PREVIEW_MEDIUM,
        Llm.GEMINI_3_1_PRO_PREVIEW_LOW,
    ]:
        return "gemini-3.1-pro-preview"
    return model.value


def _get_thinking_level_for_model(model: Llm) -> str:
    if model in [
        Llm.GEMINI_3_FLASH_PREVIEW_HIGH,
        Llm.GEMINI_3_1_PRO_PREVIEW_HIGH,
        Llm.GEMINI_3_5_FLASH_HIGH,
    ]:
        return "high"
    if model in [
        Llm.GEMINI_3_1_PRO_PREVIEW_LOW,
        Llm.GEMINI_3_5_FLASH_LOW,
    ]:
        return "low"
    if model in [Llm.GEMINI_3_1_PRO_PREVIEW_MEDIUM, Llm.GEMINI_3_5_FLASH_MEDIUM]:
        return "medium"
    if model in [Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL, Llm.GEMINI_3_5_FLASH_MINIMAL]:
        return "minimal"
    return "high"


def _extract_text_from_content(content: str | List[Dict[str, Any]]) -> str:
    if isinstance(content, str):
        return content

    for content_part in content:
        if content_part.get("type") == "text":
            return content_part.get("text", "")

    return ""


def _detect_mime_type_from_base64(base64_data: str) -> str | None:
    try:
        decoded = base64.b64decode(base64_data[:32])

        if decoded[:8] == b"\x89PNG\r\n\x1a\n":
            return "image/png"
        if decoded[:2] == b"\xff\xd8":
            return "image/jpeg"
        if decoded[:6] in (b"GIF87a", b"GIF89a"):
            return "image/gif"
        if decoded[:4] == b"RIFF" and decoded[8:12] == b"WEBP":
            return "image/webp"

        if decoded[4:8] == b"ftyp":
            return "video/mp4"
        if decoded[:4] == b"\x1aE\xdf\xa3":
            return "video/webm"
    except Exception:
        pass

    return None


def _extract_images_from_content(
    content: str | List[Dict[str, Any]],
) -> List[Dict[str, str]]:
    if isinstance(content, str):
        return []

    images: List[Dict[str, str]] = []
    for content_part in content:
        if content_part.get("type") != "image_url":
            continue

        image_url = content_part["image_url"]["url"]
        if image_url.startswith("data:"):
            mime_type = image_url.split(";")[0].split(":")[1]
            base64_data = image_url.split(",")[1]

            if mime_type == "application/octet-stream":
                detected_mime = _detect_mime_type_from_base64(base64_data)
                if detected_mime:
                    mime_type = detected_mime
                else:
                    print("Warning: Could not detect MIME type for data URL, skipping")
                    continue

            images.append({"mime_type": mime_type, "data": base64_data})
            continue

        images.append({"uri": image_url})

    return images


def _convert_message_to_turn(
    message: ChatCompletionMessageParam,
) -> Dict[str, Any]:
    """Convert an OpenAI-style chat message into an Interactions API turn.

    Each turn is ``{"role": ..., "content": [<content block>, ...]}`` where
    content blocks are the Interactions API param dicts (``text``/``image``/
    ``video``). Media is passed as base64 strings via the ``data`` field.
    """
    role = message.get("role", "user")
    content = message.get("content", "")
    turn_role = "model" if role == "assistant" else "user"

    blocks: List[Dict[str, Any]] = []

    text = _extract_text_from_content(content)  # type: ignore
    image_data_list = _extract_images_from_content(content)  # type: ignore

    if text:
        blocks.append({"type": "text", "text": text})

    for image_data in image_data_list:
        if "data" in image_data:
            mime_type = image_data["mime_type"]
            if mime_type.startswith("video/"):
                # Note: the Interactions API does not yet support video_metadata
                # (custom fps / clipping), so frames are sampled at the default rate.
                blocks.append(
                    {
                        "type": "video",
                        "data": image_data["data"],
                        "mime_type": mime_type,
                        "resolution": "high",
                    }
                )
                continue

            blocks.append(
                {
                    "type": "image",
                    "data": image_data["data"],
                    "mime_type": mime_type,
                    "resolution": "ultra_high",
                }
            )
            continue

        if "uri" in image_data:
            blocks.append({"type": "image", "uri": image_data["uri"]})

    return {"role": turn_role, "content": blocks}


@dataclass
class _FunctionCallAccumulator:
    id: str
    name: str
    arguments: Dict[str, Any] = field(default_factory=dict)


@dataclass
class GeminiParseState:
    assistant_text: str = ""
    tool_calls: List[ToolCall] = field(default_factory=list)
    interaction_id: Optional[str] = None
    status: Optional[str] = None
    turn_usage: Optional[TokenUsage] = None
    # Function calls in progress, keyed by their stream content index.
    function_calls: Dict[int, _FunctionCallAccumulator] = field(default_factory=dict)


def _extract_usage(usage: Any) -> TokenUsage | None:
    """Extract unified token usage from an Interactions API ``Usage`` object.

    Gemini reports thinking tokens separately from output tokens; they are
    folded into ``output`` to match the unified schema used by the other
    providers. ``total_input_tokens`` *includes* cached tokens, so cached
    tokens are subtracted to get the non-cached input count (same approach as
    the OpenAI provider).
    """
    if usage is None:
        return None
    input_tokens = getattr(usage, "total_input_tokens", 0) or 0
    output_tokens = getattr(usage, "total_output_tokens", 0) or 0
    thoughts = getattr(usage, "total_thought_tokens", 0) or 0
    cached_tokens = getattr(usage, "total_cached_tokens", 0) or 0
    total_tokens = getattr(usage, "total_tokens", 0) or 0
    return TokenUsage(
        input=input_tokens - cached_tokens,
        output=output_tokens + thoughts,
        cache_read=cached_tokens,
        cache_write=0,
        total=total_tokens,
    )


async def _parse_event(
    event: Any,
    state: GeminiParseState,
    on_event: EventSink,
) -> None:
    """Parse a single Interactions API server-sent event.

    Unknown event/delta types are ignored so new server features don't break
    streaming (per the Interactions API versioning policy).
    """
    event_type = getattr(event, "event_type", None)

    if event_type == "interaction.start":
        interaction = getattr(event, "interaction", None)
        if interaction is not None:
            state.interaction_id = getattr(interaction, "id", None) or state.interaction_id
        return

    if event_type == "interaction.complete":
        interaction = getattr(event, "interaction", None)
        if interaction is not None:
            state.interaction_id = (
                getattr(interaction, "id", None) or state.interaction_id
            )
            state.status = getattr(interaction, "status", None)
            usage = _extract_usage(getattr(interaction, "usage", None))
            if usage is not None:
                state.turn_usage = usage
        return

    if event_type == "interaction.status_update":
        state.status = getattr(event, "status", None)
        return

    if event_type == "error":
        err = getattr(event, "error", None)
        message = getattr(err, "message", None) or "Unknown Gemini interaction error"
        raise RuntimeError(f"Gemini interaction error: {message}")

    if event_type == "content.start":
        content = getattr(event, "content", None)
        if content is not None and getattr(content, "type", None) == "function_call":
            index = getattr(event, "index", None)
            if isinstance(index, int):
                state.function_calls[index] = _FunctionCallAccumulator(
                    id=getattr(content, "id", None) or f"tool-{uuid.uuid4().hex[:6]}",
                    name=getattr(content, "name", None) or "unknown_tool",
                    arguments=dict(getattr(content, "arguments", None) or {}),
                )
        return

    if event_type == "content.delta":
        await _parse_content_delta(event, state, on_event)
        return

    if event_type == "content.stop":
        index = getattr(event, "index", None)
        if isinstance(index, int) and index in state.function_calls:
            acc = state.function_calls.pop(index)
            state.tool_calls.append(
                ToolCall(id=acc.id, name=acc.name, arguments=acc.arguments)
            )
        return


async def _parse_content_delta(
    event: Any,
    state: GeminiParseState,
    on_event: EventSink,
) -> None:
    delta = getattr(event, "delta", None)
    if delta is None:
        return

    delta_type = getattr(delta, "type", None)

    if delta_type == "text":
        text = getattr(delta, "text", None)
        if text:
            state.assistant_text += text
            await on_event(StreamEvent(type="assistant_delta", text=text))
        return

    if delta_type == "thought_summary":
        summary = getattr(delta, "content", None)
        if summary is not None and getattr(summary, "type", None) == "text":
            text = getattr(summary, "text", None)
            if text:
                await on_event(StreamEvent(type="thinking_delta", text=text))
        return

    if delta_type == "function_call":
        index = getattr(event, "index", None)
        if not isinstance(index, int):
            return

        acc = state.function_calls.get(index)
        if acc is None:
            acc = _FunctionCallAccumulator(
                id=getattr(delta, "id", None) or f"tool-{uuid.uuid4().hex[:6]}",
                name=getattr(delta, "name", None) or "unknown_tool",
            )
            state.function_calls[index] = acc
        else:
            if getattr(delta, "id", None):
                acc.id = delta.id
            if getattr(delta, "name", None):
                acc.name = delta.name

        # Each function_call delta carries the current snapshot of the parsed
        # arguments. Replacing with the latest snapshot lets the engine stream
        # the in-progress file contents to the UI as they grow.
        arguments = getattr(delta, "arguments", None)
        if arguments is not None:
            acc.arguments = dict(arguments)

        await on_event(
            StreamEvent(
                type="tool_call_delta",
                tool_call_id=acc.id,
                tool_name=acc.name,
                tool_arguments=acc.arguments,
            )
        )
        return


class GeminiProviderSession(ProviderSession):
    def __init__(
        self,
        client: genai.Client,
        model: Llm,
        prompt_messages: List[ChatCompletionMessageParam],
        tools: List[Dict[str, Any]],
    ):
        self._client = client
        self._model = model
        self._tools = tools
        self._total_usage = TokenUsage()

        # The first chat message is the system prompt; it becomes an
        # interaction-scoped ``system_instruction`` rather than a turn.
        self._system_prompt = str(prompt_messages[0].get("content", ""))

        # Input sent on the next ``stream_turn`` call. Turn 1 sends the full
        # converted conversation; subsequent turns send only the tool results
        # and rely on server-side history via ``previous_interaction_id``.
        self._next_input: List[Dict[str, Any]] = [
            _convert_message_to_turn(msg) for msg in prompt_messages[1:]
        ]
        self._previous_interaction_id: Optional[str] = None

    async def stream_turn(self, on_event: EventSink) -> ProviderTurn:
        thinking_level = _get_thinking_level_for_model(self._model)
        api_model_name = _get_gemini_api_model_name(self._model)
        generation_config: Dict[str, Any] = {
            "temperature": 1.0,
            "max_output_tokens": 50000,
            "thinking_level": thinking_level,
            "thinking_summaries": "auto",
        }

        if IS_DEBUG_ENABLED:
            write_gemini_prompt_report(
                model=self._model,
                api_model_name=api_model_name,
                thinking_level=thinking_level,
                system_instruction=self._system_prompt,
                contents=self._next_input,
                config=generation_config,
            )

        create_kwargs: Dict[str, Any] = {
            "model": api_model_name,
            "input": self._next_input,
            "system_instruction": self._system_prompt,
            "generation_config": generation_config,
            "tools": self._tools,
            "stream": True,
        }
        if self._previous_interaction_id is not None:
            create_kwargs["previous_interaction_id"] = self._previous_interaction_id

        stream = await self._client.aio.interactions.create(**create_kwargs)

        state = GeminiParseState()
        async for event in stream:
            await _parse_event(event, state, on_event)

        if state.turn_usage is not None:
            self._total_usage.accumulate(state.turn_usage)

        # Continue the conversation server-side on the next turn.
        self._previous_interaction_id = state.interaction_id

        return ProviderTurn(
            assistant_text=state.assistant_text,
            tool_calls=state.tool_calls,
            assistant_turn=None,
        )

    def append_tool_results(
        self,
        turn: ProviderTurn,
        executed_tool_calls: list[ExecutedToolCall],
    ) -> None:
        if self._previous_interaction_id is None:
            raise ValueError(
                "Gemini turn is missing an interaction id. Cannot append tool "
                "results without the previous interaction to continue from."
            )

        # With server-side history, the next turn only needs to carry the tool
        # results; the model turn is already stored under previous_interaction_id.
        self._next_input = [
            {
                "type": "function_result",
                "call_id": executed.tool_call.id,
                "name": executed.tool_call.name,
                "result": executed.result.result,
            }
            for executed in executed_tool_calls
        ]

    async def close(self) -> None:
        u = self._total_usage
        model_name = _get_gemini_api_model_name(self._model)
        pricing = MODEL_PRICING.get(model_name)
        cost_str = f" cost=${u.cost(pricing):.4f}" if pricing else ""
        cache_hit_rate_str = f" cache_hit_rate={u.cache_hit_rate_percent():.2f}%"
        print(
            f"[TOKEN USAGE] provider=gemini model={model_name} | "
            f"input={u.input} output={u.output} "
            f"cache_read={u.cache_read} cache_write={u.cache_write} "
            f"total={u.total}{cache_hit_rate_str}{cost_str}"
        )
