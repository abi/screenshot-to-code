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

    params["temperature"] = 0
    params["stream"] = True

    # 4.1 series
    if model_name in [
        "gpt-4.1-2025-04-14",
    ]:
        params["temperature"] = 0
        params["stream"] = True
        params["max_tokens"] = 20000

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
