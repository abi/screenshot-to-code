import base64
import time
from typing import Awaitable, Callable, Dict, List
from openai.types.chat import ChatCompletionMessageParam
from google import genai
from google.genai import types
from llm import Completion, Llm


def extract_image_from_messages(
    messages: List[ChatCompletionMessageParam],
) -> Dict[str, str]:
    """
    Extracts image data from OpenAI-style chat completion messages.

    Args:
        messages: List of ChatCompletionMessageParam containing message content

    Returns:
        Dictionary with mime_type and data keys for the first image found
    """
    for content_part in messages[-1]["content"]:  # type: ignore
        if content_part["type"] == "image_url":  # type: ignore
            image_url = content_part["image_url"]["url"]  # type: ignore
            if image_url.startswith("data:"):  # type: ignore
                # Extract base64 data and mime type for data URLs
                mime_type = image_url.split(";")[0].split(":")[1]  # type: ignore
                base64_data = image_url.split(",")[1]  # type: ignore
                return {"mime_type": mime_type, "data": base64_data}
            else:
                # Handle regular URLs - would need to download and convert to base64
                # For now, just return the URI
                return {"uri": image_url}  # type: ignore

    # No image found
    raise ValueError("No image found in messages")


async def stream_gemini_response(
    messages: List[ChatCompletionMessageParam],
    api_key: str,
    callback: Callable[[str], Awaitable[None]],
    model_name: str,
) -> Completion:
    start_time = time.time()

    # Get image data from messages
    image_data = extract_image_from_messages(messages)

    client = genai.Client(api_key=api_key)
    full_response = ""

    if model_name == Llm.GEMINI_2_5_FLASH_PREVIEW_05_20.value:
        # Gemini 2.5 Flash supports thinking budgets
        config = types.GenerateContentConfig(
            temperature=0,
            max_output_tokens=20000,
            thinking_config=types.ThinkingConfig(
                thinking_budget=5000, include_thoughts=True
            ),
        )
    else:
        # TODO: Fix output tokens here
        config = types.GenerateContentConfig(
            temperature=0,
            max_output_tokens=8000,
        )

    async for chunk in await client.aio.models.generate_content_stream(
        model=model_name,
        contents={
            "parts": [
                {"text": messages[0]["content"]},  # type: ignore
                types.Part.from_bytes(
                    data=base64.b64decode(image_data["data"]),
                    mime_type=image_data["mime_type"],
                ),
            ]
        },
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
