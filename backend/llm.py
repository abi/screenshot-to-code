import os
from typing import Awaitable, Callable
from openai import AsyncOpenAI

MODEL_GPT_4_VISION = "gpt-4-vision-preview"


async def stream_openai_response(
    messages,
    api_key: str,
    base_url: str | None,
    callback: Callable[[str], Awaitable[None]],
):
    client = AsyncOpenAI(api_key=api_key, base_url=base_url)

    model = MODEL_GPT_4_VISION

    # Base parameters
    params = {"model": model, "messages": messages, "stream": True, "timeout": 600}

    # Add 'max_tokens' only if the model is a GPT4 vision model
    if model == MODEL_GPT_4_VISION:
        params["max_tokens"] = 4096
        params["temperature"] = 0

    completion = await client.chat.completions.create(**params)
    full_response = ""
    async for chunk in completion:
        content = chunk.choices[0].delta.content or ""
        full_response += content
        await callback(content)

    return full_response
