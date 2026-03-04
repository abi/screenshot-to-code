# pyright: reportUnknownVariableType=false
import base64
import copy
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, cast

from google import genai
from google.genai import types
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
from llm import Llm


DEFAULT_VIDEO_FPS = 10


def serialize_gemini_tools(tools: List[CanonicalToolDefinition]) -> List[types.Tool]:
    declarations = [
        types.FunctionDeclaration(
            name=tool.name,
            description=tool.description,
            parameters_json_schema=copy.deepcopy(tool.parameters),
        )
        for tool in tools
    ]
    return [types.Tool(function_declarations=declarations)]


def _get_gemini_api_model_name(model: Llm) -> str:
    if model in [Llm.GEMINI_3_FLASH_PREVIEW_HIGH, Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL]:
        return "gemini-3-flash-preview"
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
    ]:
        return "high"
    if model == Llm.GEMINI_3_1_PRO_PREVIEW_LOW:
        return "low"
    if model == Llm.GEMINI_3_1_PRO_PREVIEW_MEDIUM:
        return "medium"
    if model == Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL:
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


def _extract_images_from_content(content: str | List[Dict[str, Any]]) -> List[Dict[str, str]]:
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


def _convert_message_to_gemini_content(
    message: ChatCompletionMessageParam,
) -> types.Content:
    role = message.get("role", "user")
    content = message.get("content", "")
    gemini_role = "model" if role == "assistant" else "user"

    parts: List[types.Part | Dict[str, str]] = []

    text = _extract_text_from_content(content)  # type: ignore
    image_data_list = _extract_images_from_content(content)  # type: ignore

    if text:
        parts.append({"text": text})

    for image_data in image_data_list:
        if "data" in image_data:
            mime_type = image_data["mime_type"]
            media_bytes = base64.b64decode(image_data["data"])
            if mime_type.startswith("video/"):
                parts.append(
                    types.Part(
                        inline_data=types.Blob(data=media_bytes, mime_type=mime_type),
                        video_metadata=types.VideoMetadata(fps=DEFAULT_VIDEO_FPS),
                        media_resolution=types.PartMediaResolutionLevel.MEDIA_RESOLUTION_HIGH,
                    )
                )
                continue

            parts.append(
                types.Part.from_bytes(
                    data=media_bytes,
                    mime_type=mime_type,
                    media_resolution=types.PartMediaResolutionLevel.MEDIA_RESOLUTION_ULTRA_HIGH,
                )
            )
            continue

        if "uri" in image_data:
            parts.append({"file_uri": image_data["uri"]})

    return types.Content(role=gemini_role, parts=parts)  # type: ignore


@dataclass
class GeminiParseState:
    assistant_text: str = ""
    tool_calls: List[ToolCall] = field(default_factory=list)
    model_parts: List[types.Part] = field(default_factory=list)
    model_role: str = "model"


def _extract_usage(chunk: types.GenerateContentResponse) -> TokenUsage | None:
    """Extract unified token usage from a Gemini streaming chunk.

    Gemini reports thinking tokens separately; they are folded into ``output``
    to match the unified schema used by the other providers.

    ``prompt_token_count`` *includes* ``cached_content_token_count``, so we
    subtract cached tokens to get the non-cached input count (same approach
    as the OpenAI provider).
    """
    meta = chunk.usage_metadata
    if meta is None:
        return None
    candidates = meta.candidates_token_count or 0
    thoughts = meta.thoughts_token_count or 0
    prompt_tokens = meta.prompt_token_count or 0
    cached_tokens = meta.cached_content_token_count or 0
    return TokenUsage(
        input=prompt_tokens - cached_tokens,
        output=candidates + thoughts,
        cache_read=cached_tokens,
        cache_write=0,
        total=meta.total_token_count or 0,
    )


async def _parse_chunk(
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
        # Preserve each model part as streamed so thought signatures remain attached.
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


class GeminiProviderSession(ProviderSession):
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
        self._total_usage = TokenUsage()

        self._system_prompt = str(prompt_messages[0].get("content", ""))
        self._contents: List[types.Content] = [
            _convert_message_to_gemini_content(msg) for msg in prompt_messages[1:]
        ]

    async def stream_turn(self, on_event: EventSink) -> ProviderTurn:
        thinking_level = _get_thinking_level_for_model(self._model)
        config = types.GenerateContentConfig(
            temperature=1.0,
            max_output_tokens=50000,
            system_instruction=self._system_prompt,
            thinking_config=types.ThinkingConfig(
                thinking_level=cast(Any, thinking_level),
                include_thoughts=True,
            ),
            tools=self._tools,
        )

        stream = await self._client.aio.models.generate_content_stream(
            model=_get_gemini_api_model_name(self._model),
            contents=cast(Any, self._contents),
            config=config,
        )

        state = GeminiParseState()
        turn_usage: TokenUsage | None = None
        async for chunk in stream:
            await _parse_chunk(chunk, state, on_event)
            chunk_usage = _extract_usage(chunk)
            if chunk_usage is not None:
                turn_usage = chunk_usage

        if turn_usage is not None:
            self._total_usage.accumulate(turn_usage)

        assistant_turn = (
            types.Content(role=state.model_role, parts=state.model_parts)
            if state.model_parts
            else None
        )

        return ProviderTurn(
            assistant_text=state.assistant_text,
            tool_calls=state.tool_calls,
            assistant_turn=assistant_turn,
        )

    def append_tool_results(
        self,
        turn: ProviderTurn,
        executed_tool_calls: list[ExecutedToolCall],
    ) -> None:
        model_content = turn.assistant_turn
        if not isinstance(model_content, types.Content) or not model_content.parts:
            raise ValueError(
                "Gemini step is missing model content. Cannot append tool results without the original model turn."
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
        model_name = _get_gemini_api_model_name(self._model)
        pricing = MODEL_PRICING.get(model_name)
        return usage.cost(pricing) if pricing else 0.0

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
