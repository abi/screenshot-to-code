import time
from typing import Awaitable, Callable, List
from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam, ChatCompletionChunk
from llm import Completion


async def stream_openai_response(
    messages: List[ChatCompletionMessageParam],
    api_key: str,
    base_url: str | None,
    callback: Callable[[str], Awaitable[None]],
    model_name: str,
) -> Completion:
    start_time = time.time()
    client = AsyncOpenAI(api_key=api_key, base_url=base_url)

    # Base parameters
    params = {
        "model": model_name,
        "messages": messages,
        "timeout": 600,
    }

    # O1 doesn't support streaming or temperature
    if model_name not in ["o1-2024-12-17", "o4-mini-2025-04-16", "o3-2025-04-16"]:
        params["temperature"] = 0
        params["stream"] = True

    # 4.1 series
    if model_name in [
        "gpt-4.1-2025-04-14",
        "gpt-4.1-mini-2025-04-14",
        "gpt-4.1-nano-2025-04-14",
    ]:
        params["temperature"] = 0
        params["stream"] = True
        params["max_tokens"] = 10000

    if model_name == "gpt-4o-2024-05-13":
        params["max_tokens"] = 4096

    if model_name == "gpt-4o-2024-11-20":
        params["max_tokens"] = 16384

    if model_name == "o1-2024-12-17":
        params["max_completion_tokens"] = 20000

    if model_name in ["o4-mini-2025-04-16", "o3-2025-04-16"]:
        params["max_completion_tokens"] = 20000
        params["stream"] = True
        params["reasoning_effort"] = "high"

    # O1 doesn't support streaming
    if model_name == "o1-2024-12-17":
        response = await client.chat.completions.create(**params)  # type: ignore
        full_response = response.choices[0].message.content  # type: ignore
    else:
        stream = await client.chat.completions.create(**params)  # type: ignore
        full_response = ""
        async for chunk in stream:  # type: ignore
            assert isinstance(chunk, ChatCompletionChunk)
            if (
                chunk.choices
                and len(chunk.choices) > 0
                and chunk.choices[0].delta
                and chunk.choices[0].delta.content
            ):
                content = chunk.choices[0].delta.content or ""
                full_response += content
                await callback(content)

    await client.close()

    completion_time = time.time() - start_time
    return {"duration": completion_time, "code": full_response}
