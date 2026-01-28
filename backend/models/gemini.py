import base64
import time
from typing import Any, Awaitable, Callable, Dict, List
from openai.types.chat import ChatCompletionMessageParam
from google import genai
from google.genai import types
from llm import Completion, Llm
from video.cost_estimation import (
    calculate_cost,
    estimate_video_generation_cost,
    format_cost_estimate,
    format_detailed_input_estimate,
    get_video_duration_from_bytes,
    MediaResolution,
)

# Set to True to print debug messages for Gemini requests
DEBUG_GEMINI = False


def get_gemini_api_model_name(model: Llm) -> str:
    if model in [Llm.GEMINI_3_FLASH_PREVIEW_HIGH, Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL]:
        return "gemini-3-flash-preview"
    elif model in [Llm.GEMINI_3_PRO_PREVIEW_HIGH, Llm.GEMINI_3_PRO_PREVIEW_LOW]:
        return "gemini-3-pro-preview"
    return model.value


def get_thinking_level_for_model(model: Llm) -> str:
    if model in [Llm.GEMINI_3_FLASH_PREVIEW_HIGH, Llm.GEMINI_3_PRO_PREVIEW_HIGH]:
        return "high"
    elif model == Llm.GEMINI_3_PRO_PREVIEW_LOW:
        return "low"
    elif model == Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL:
        return "minimal"
    return "high"


def extract_text_from_content(content: str | List[Dict[str, Any]]) -> str:
    """
    Extracts text from message content, handling both string and list formats.
    """
    if isinstance(content, str):
        return content

    # Content is a list of content parts - find the text part
    for content_part in content:
        if content_part.get("type") == "text":
            return content_part.get("text", "")

    return ""


def detect_mime_type_from_base64(base64_data: str) -> str | None:
    """
    Detect MIME type from base64 data by checking magic bytes.
    Returns detected MIME type or None if unknown.
    """
    try:
        # Decode first few bytes to check magic numbers
        decoded = base64.b64decode(base64_data[:32])

        # Check for common image formats
        if decoded[:8] == b'\x89PNG\r\n\x1a\n':
            return "image/png"
        if decoded[:2] == b'\xff\xd8':
            return "image/jpeg"
        if decoded[:6] in (b'GIF87a', b'GIF89a'):
            return "image/gif"
        if decoded[:4] == b'RIFF' and decoded[8:12] == b'WEBP':
            return "image/webp"

        # Check for video formats
        if decoded[4:8] == b'ftyp':
            # MP4/MOV file
            return "video/mp4"
        if decoded[:4] == b'\x1aE\xdf\xa3':
            # WebM file
            return "video/webm"
    except Exception:
        pass

    return None


def extract_image_from_content(content: str | List[Dict[str, Any]]) -> Dict[str, str] | None:
    """
    Extracts image data from message content.

    Args:
        content: Message content (string or list of content parts)

    Returns:
        Dictionary with mime_type and data keys for the first image found, or None if no image
    """
    # If content is a string, there's no image
    if isinstance(content, str):
        return None

    # Content is a list of content parts
    for content_part in content:
        if content_part.get("type") == "image_url":
            image_url = content_part["image_url"]["url"]
            if image_url.startswith("data:"):
                # Extract base64 data and mime type for data URLs
                mime_type = image_url.split(";")[0].split(":")[1]
                base64_data = image_url.split(",")[1]

                # If MIME type is generic, try to detect from data
                if mime_type == "application/octet-stream":
                    detected_mime = detect_mime_type_from_base64(base64_data)
                    if detected_mime:
                        mime_type = detected_mime
                    else:
                        # Skip this content if we can't determine the type
                        print(f"Warning: Could not detect MIME type for data URL, skipping")
                        continue

                return {"mime_type": mime_type, "data": base64_data}
            else:
                # Handle regular URLs
                return {"uri": image_url}

    # No image found
    return None


def convert_message_to_gemini_content(
    message: ChatCompletionMessageParam,
) -> types.Content:
    """
    Convert an OpenAI-style message to Gemini Content format.
    """
    role = message.get("role", "user")
    content = message.get("content", "")

    # Map roles: OpenAI uses "assistant", Gemini uses "model"
    gemini_role = "model" if role == "assistant" else "user"

    parts: List[types.Part | Dict[str, str]] = []

    # Extract text and image from content
    text = extract_text_from_content(content)  # type: ignore
    image_data = extract_image_from_content(content)  # type: ignore

    if text:
        parts.append({"text": text})
    if image_data and "data" in image_data:
        parts.append(
            types.Part.from_bytes(
                data=base64.b64decode(image_data["data"]),
                mime_type=image_data["mime_type"],
                media_resolution=types.PartMediaResolutionLevel.MEDIA_RESOLUTION_ULTRA_HIGH,
            )
        )

    return types.Content(role=gemini_role, parts=parts)  # type: ignore


async def stream_gemini_response(
    messages: List[ChatCompletionMessageParam],
    api_key: str,
    callback: Callable[[str], Awaitable[None]],
    model: Llm,
    thinking_callback: Callable[[str], Awaitable[None]] | None = None,
) -> Completion:
    """
    Stream a response from Gemini.

    Message format (same as OpenAI/Claude):
    - messages[0]: System message with role="system", content=<system prompt string>
    - messages[1:]: User/assistant messages, where user messages may contain images

    This mirrors how Claude handles messages:
    - System prompt extracted from messages[0]
    - All conversation history from messages[1:] is converted to Gemini format
    """
    start_time = time.time()

    # Extract system prompt from first message (same as Claude)
    system_prompt = str(messages[0].get("content", ""))

    # Convert all messages after the system prompt to Gemini format
    # This includes the full conversation history for edits
    gemini_contents: List[types.Content] = []
    for msg in messages[1:]:
        gemini_contents.append(convert_message_to_gemini_content(msg))

    # Debug: print truncated message info
    if DEBUG_GEMINI:
        print(f"\n=== Gemini Request Debug ({model.value}) ===")
        print(f"System prompt (first 200 chars): {system_prompt[:200]}...")
        print(f"Number of conversation messages: {len(gemini_contents)}")
        for i, content in enumerate(gemini_contents):
            role = content.role
            text_preview = ""
            has_image = False
            for part in content.parts:
                if hasattr(part, "text") and part.text:
                    text_preview = part.text[:100]
                if hasattr(part, "inline_data") and part.inline_data:
                    has_image = True
            print(f"  [{i}] {role}: {text_preview}... (has_image={has_image})")
        print("=" * 50)

    client = genai.Client(api_key=api_key)
    full_response = ""

    if model == Llm.GEMINI_2_5_FLASH_PREVIEW_05_20:
        # Gemini 2.5 Flash supports thinking budgets
        config = types.GenerateContentConfig(
            temperature=0,
            max_output_tokens=20000,
            system_instruction=system_prompt,
            thinking_config=types.ThinkingConfig(
                thinking_budget=5000, include_thoughts=True
            ),
        )
    elif model == Llm.GEMINI_3_FLASH_PREVIEW_HIGH:
        # Gemini 3 Flash with HIGH thinking
        config = types.GenerateContentConfig(
            temperature=0,
            max_output_tokens=30000,
            system_instruction=system_prompt,
            thinking_config=types.ThinkingConfig(
                thinking_level="high", include_thoughts=True
            ),
        )
    elif model == Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL:
        # Gemini 3 Flash with MINIMAL thinking
        config = types.GenerateContentConfig(
            temperature=0,
            max_output_tokens=30000,
            system_instruction=system_prompt,
            thinking_config=types.ThinkingConfig(
                thinking_level="minimal", include_thoughts=True
            ),
        )
    elif model == Llm.GEMINI_3_PRO_PREVIEW_HIGH:
        # Gemini 3 Pro with HIGH thinking
        config = types.GenerateContentConfig(
            temperature=0,
            max_output_tokens=30000,
            system_instruction=system_prompt,
            thinking_config=types.ThinkingConfig(
                thinking_level="high", include_thoughts=True
            ),
        )
    elif model == Llm.GEMINI_3_PRO_PREVIEW_LOW:
        # Gemini 3 Pro with LOW thinking
        config = types.GenerateContentConfig(
            temperature=0,
            max_output_tokens=30000,
            system_instruction=system_prompt,
            thinking_config=types.ThinkingConfig(
                thinking_level="low", include_thoughts=True
            ),
        )
    else:
        config = types.GenerateContentConfig(
            temperature=0,
            max_output_tokens=8000,
            system_instruction=system_prompt,
        )

    # Map variant model names to actual API model names
    api_model_name = get_gemini_api_model_name(model)

    async for chunk in await client.aio.models.generate_content_stream(
        model=api_model_name,
        contents=gemini_contents,
        config=config,
    ):
        if chunk.candidates and len(chunk.candidates) > 0:
            for part in chunk.candidates[0].content.parts:
                if not part.text:
                    continue
                elif part.thought:
                    if thinking_callback:
                        await thinking_callback(part.text)
                    else:
                        print(f"\n=== Gemini Thinking Summary ({model.value}) ===")
                        print(part.text)
                        print("=" * 50)
                else:
                    full_response += part.text
                    await callback(part.text)

    completion_time = time.time() - start_time
    return {"duration": completion_time, "code": full_response}


async def stream_gemini_response_video(
    video_bytes: bytes,
    video_mime_type: str,
    system_prompt: str,
    api_key: str,
    callback: Callable[[str], Awaitable[None]],
    model: Llm,
    thinking_callback: Callable[[str], Awaitable[None]] | None = None,
) -> Completion:
    start_time = time.time()

    # Video generation settings
    VIDEO_FPS = 10
    MAX_OUTPUT_TOKENS = 50000

    # Get video duration and estimate cost
    video_duration = get_video_duration_from_bytes(video_bytes)
    if video_duration:
        thinking_level = get_thinking_level_for_model(model)
        estimated_cost = estimate_video_generation_cost(
            video_duration_seconds=video_duration,
            model=model,
            fps=VIDEO_FPS,
            media_resolution=MediaResolution.HIGH,
            max_output_tokens=MAX_OUTPUT_TOKENS,
            thinking_level=thinking_level,
        )
        print(f"\n=== Video Generation Cost Estimate ({model.value}) ===")
        print(format_detailed_input_estimate(video_duration, VIDEO_FPS, MediaResolution.HIGH, model))
        print(f"Output tokens (est): {estimated_cost.output_tokens:,} (${estimated_cost.output_cost:.4f})")
        print(f"Total estimated cost: ${estimated_cost.total_cost:.4f}")
        print("=" * 50)
    else:
        print("Warning: Could not determine video duration for cost estimation")

    client = genai.Client(api_key=api_key)
    full_response = ""

    # Create content with video inline data at specified FPS for better fidelity
    contents = types.Content(
        role="user",
        parts=[
            types.Part(
                inline_data=types.Blob(data=video_bytes, mime_type=video_mime_type),
                video_metadata=types.VideoMetadata(fps=VIDEO_FPS),
                media_resolution=types.PartMediaResolutionLevel.MEDIA_RESOLUTION_HIGH
            ),
            types.Part(text="Analyze this video and generate the code."),
        ],
    )

    # Configure based on model
    if model == Llm.GEMINI_3_FLASH_PREVIEW_HIGH:
        config = types.GenerateContentConfig(
            temperature=1.0,
            max_output_tokens=MAX_OUTPUT_TOKENS,
            system_instruction=system_prompt,
            thinking_config=types.ThinkingConfig(
                thinking_level="high", include_thoughts=True
            ),
        )
    elif model == Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL:
        config = types.GenerateContentConfig(
            temperature=1.0,
            max_output_tokens=MAX_OUTPUT_TOKENS,
            system_instruction=system_prompt,
            thinking_config=types.ThinkingConfig(
                thinking_level="minimal", include_thoughts=True
            ),
            media_resolution=types.MediaResolution.MEDIA_RESOLUTION_HIGH,
        )
    elif model == Llm.GEMINI_3_PRO_PREVIEW_HIGH:
        config = types.GenerateContentConfig(
            temperature=1.0,
            max_output_tokens=MAX_OUTPUT_TOKENS,
            system_instruction=system_prompt,
            thinking_config=types.ThinkingConfig(
                thinking_level="high", include_thoughts=True
            ),
            media_resolution=types.MediaResolution.MEDIA_RESOLUTION_HIGH,
        )
    elif model == Llm.GEMINI_3_PRO_PREVIEW_LOW:
        config = types.GenerateContentConfig(
            temperature=1.0,
            max_output_tokens=MAX_OUTPUT_TOKENS,
            system_instruction=system_prompt,
            thinking_config=types.ThinkingConfig(
                thinking_level="low", include_thoughts=True
            ),
            media_resolution=types.MediaResolution.MEDIA_RESOLUTION_HIGH,
        )
    else:
        # Default config for other models
        config = types.GenerateContentConfig(
            temperature=1.0,
            max_output_tokens=MAX_OUTPUT_TOKENS,
            system_instruction=system_prompt,
        )

    api_model_name = get_gemini_api_model_name(model)

    if DEBUG_GEMINI:
        print(f"\n=== Gemini Video Request Debug ({api_model_name}) ===")
        print(f"Video MIME type: {video_mime_type}")
        print(f"Video size: {len(video_bytes)} bytes")
        print(f"System prompt (first 200 chars): {system_prompt[:200]}...")
        print("=" * 50)

    # Track actual token usage from the response
    # usage_metadata fields: prompt_token_count, candidates_token_count, total_token_count
    usage_metadata = None

    async for chunk in await client.aio.models.generate_content_stream(
        model=api_model_name,
        contents=contents,
        config=config,
    ):
        # Capture usage metadata (available in final chunks)
        if chunk.usage_metadata:
            usage_metadata = chunk.usage_metadata

        if chunk.candidates and len(chunk.candidates) > 0:
            for part in chunk.candidates[0].content.parts:
                if not part.text:
                    continue
                elif part.thought:
                    if thinking_callback:
                        await thinking_callback(part.text)
                    else:
                        print(f"\n=== Gemini Video Thinking Summary ({api_model_name}) ===")
                        print(part.text)
                        print("=" * 50)
                else:
                    full_response += part.text
                    await callback(part.text)

    completion_time = time.time() - start_time

    # Log actual token usage and cost
    if usage_metadata:
        input_tokens = usage_metadata.prompt_token_count or 0
        thinking_tokens = usage_metadata.thoughts_token_count or 0
        output_tokens = usage_metadata.candidates_token_count or 0
        total_tokens = usage_metadata.total_token_count or 0

        # Thinking tokens are billed at the same rate as output tokens
        billable_output_tokens = thinking_tokens + output_tokens
        actual_cost = calculate_cost(input_tokens, billable_output_tokens, model)

        print(f"\n=== Video Generation Actual Usage ({model.value}) ===")
        print(f"Input tokens:    {input_tokens:,} (${actual_cost.input_cost:.4f})")
        print(f"Thinking tokens: {thinking_tokens:,}")
        print(f"Output tokens:   {output_tokens:,}")
        print(f"Billable output: {billable_output_tokens:,} (${actual_cost.output_cost:.4f})")
        print(f"Total tokens:    {total_tokens:,}")
        print(f"Total cost:      ${actual_cost.total_cost:.4f}")
        print(f"Generation time: {completion_time:.2f} seconds")
        print("=" * 50)

    return {"duration": completion_time, "code": full_response}
