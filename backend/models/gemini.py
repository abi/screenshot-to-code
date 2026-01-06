import base64
import time
from typing import Any, Awaitable, Callable, Dict, List
from openai.types.chat import ChatCompletionMessageParam
from google import genai
from google.genai import types
from llm import Completion, Llm


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
                return {"mime_type": mime_type, "data": base64_data}
            else:
                # Handle regular URLs
                return {"uri": image_url}

    # No image found
    return None


async def stream_gemini_response(
    messages: List[ChatCompletionMessageParam],
    api_key: str,
    callback: Callable[[str], Awaitable[None]],
    model_name: str,
) -> Completion:
    """
    Stream a response from Gemini.

    Message format (same as OpenAI/Claude):
    - messages[0]: System message with role="system", content=<system prompt string>
    - messages[1:]: User/assistant messages, where user messages may contain images

    This mirrors how Claude handles messages:
    - System prompt extracted from messages[0]
    - User content (text + optional image) from messages[1:]
    """
    start_time = time.time()

    # Extract system prompt from first message (same as Claude)
    system_prompt = str(messages[0].get("content", ""))

    # Get user message content from the last user message (messages[1] typically)
    # For simplicity, we look at the last message which should be the user message with content
    user_message = messages[-1]
    user_content = user_message.get("content", "")  # type: ignore

    # Extract text and image from user content
    user_text = extract_text_from_content(user_content)  # type: ignore
    image_data = extract_image_from_content(user_content)  # type: ignore

    client = genai.Client(api_key=api_key)
    full_response = ""

    if model_name == Llm.GEMINI_2_5_FLASH_PREVIEW_05_20.value:
        # Gemini 2.5 Flash supports thinking budgets
        config = types.GenerateContentConfig(
            temperature=0,
            max_output_tokens=20000,
            system_instruction=system_prompt,
            thinking_config=types.ThinkingConfig(
                thinking_budget=5000, include_thoughts=True
            ),
        )
    elif model_name == Llm.GEMINI_3_FLASH_PREVIEW.value:
        # Gemini 3 Flash uses thinking_level instead of thinking_budget
        config = types.GenerateContentConfig(
            temperature=0,
            max_output_tokens=30000,
            system_instruction=system_prompt,
            thinking_config=types.ThinkingConfig(thinking_level="minimal"),
        )
    elif model_name == Llm.GEMINI_3_PRO_PREVIEW.value:
        # Gemini 3 Pro with low thinking
        config = types.GenerateContentConfig(
            temperature=0,
            max_output_tokens=30000,
            system_instruction=system_prompt,
            thinking_config=types.ThinkingConfig(thinking_level="low"),
        )
    else:
        config = types.GenerateContentConfig(
            temperature=0,
            max_output_tokens=8000,
            system_instruction=system_prompt,
        )

    # Build content parts: text first, then image if present
    parts: List[types.Part | Dict[str, str]] = []
    if user_text:
        parts.append({"text": user_text})
    if image_data and "data" in image_data:
        parts.append(
            types.Part.from_bytes(
                data=base64.b64decode(image_data["data"]),
                mime_type=image_data["mime_type"],
            )
        )

    async for chunk in await client.aio.models.generate_content_stream(
        model=model_name,
        contents={"parts": parts},
        config=config,
    ):
        if chunk.candidates and len(chunk.candidates) > 0:
            for part in chunk.candidates[0].content.parts:
                if not part.text:
                    continue
                elif part.thought:
                    print("Thought summary:")
                    print(part.text)
                else:
                    full_response += part.text
                    await callback(part.text)

    completion_time = time.time() - start_time
    return {"duration": completion_time, "code": full_response}
