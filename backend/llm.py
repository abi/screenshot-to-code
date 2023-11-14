import os
from typing import Awaitable, Callable
from openai import AsyncOpenAI

MODEL_GPT_4_VISION = "gpt-4-vision-preview"

# TODO: Remove after testing
MODEL_GPT_4_VISION = "gpt-3.5-turbo-1106"

client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


async def stream_openai_response(messages, callback: Callable[[str], Awaitable[None]]):
    model = MODEL_GPT_4_VISION

    # Base parameters
    params = {"model": model, "messages": messages, "stream": True, "timeout": 600}

    # Add 'max_tokens' only if the model is a GPT4 vision model
    if model == MODEL_GPT_4_VISION:
        params["max_tokens"] = 4096
        params["temperature"] = 0

    completion = await client.chat.completions.create(**params)

    async for chunk in completion:
        content = chunk.choices[0].delta.content or ""
        await callback(content)
