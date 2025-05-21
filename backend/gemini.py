import base64
import time
from typing import Awaitable, Callable, List, TypedDict
from openai.types.chat import ChatCompletionMessageParam
from google import genai
from google.genai import types


class Completion(TypedDict):
    duration: float
    code: str


async def stream_gemini_response(
    messages: List[ChatCompletionMessageParam],
    api_key: str,
    callback: Callable[[str], Awaitable[None]],
    model_name: str,
) -> Completion:
    start_time = time.time()

    # Extract image URLs from messages
    image_urls = []
    for content_part in messages[-1]["content"]:  # type: ignore
        if content_part["type"] == "image_url":  # type: ignore
            image_url = content_part["image_url"]["url"]  # type: ignore
            if image_url.startswith("data:"):  # type: ignore
                # Extract base64 data and mime type for data URLs
                mime_type = image_url.split(";")[0].split(":")[1]  # type: ignore
                base64_data = image_url.split(",")[1]  # type: ignore
                image_urls = [{"mime_type": mime_type, "data": base64_data}]  # type: ignore
            else:
                # Store regular URLs
                image_urls = [{"uri": image_url}]  # type: ignore
            break  # Exit after first image URL

    client = genai.Client(api_key=api_key)
    full_response = ""

    async for chunk in await client.aio.models.generate_content_stream(
        model=model_name,
        contents={
            "parts": [
                {"text": messages[0]["content"]},  # type: ignore
                types.Part.from_bytes(
                    data=base64.b64decode(image_urls[0]["data"]),
                    mime_type=image_urls[0]["mime_type"],
                ),
            ]
        },
        config=types.GenerateContentConfig(
            temperature=0,
            max_output_tokens=20000,
            thinking_config=types.ThinkingConfig(thinking_budget=10000),
        ),
    ):
        if chunk.text:
            full_response += chunk.text
            await callback(chunk.text)
    completion_time = time.time() - start_time
    return {"duration": completion_time, "code": full_response}
