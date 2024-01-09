from typing import Awaitable, Callable, List
from openai import AsyncOpenAI, AsyncAzureOpenAI
from openai.types.chat import ChatCompletionMessageParam, ChatCompletionChunk

from api_types import ApiProviderInfo

MODEL_GPT_4_VISION = "gpt-4-vision-preview"


async def stream_openai_response(
    messages: List[ChatCompletionMessageParam],
    api_provider_info: ApiProviderInfo,
    callback: Callable[[str], Awaitable[None]],
) -> str:
    if api_provider_info.name == "openai":
        client = AsyncOpenAI(
            api_key=api_provider_info.api_key, base_url=api_provider_info.base_url
        )
    elif api_provider_info.name == "azure":
        client = AsyncAzureOpenAI(
            api_version=api_provider_info.api_version,
            api_key=api_provider_info.api_key,
            azure_endpoint=f"https://{api_provider_info.resource_name}.openai.azure.com/",
            azure_deployment=api_provider_info.deployment_name,
        )
    else:
        raise Exception("Invalid api_provider_info")

    model = MODEL_GPT_4_VISION

    # Base parameters
    params = {"model": model, "messages": messages, "stream": True, "timeout": 600}

    # Add 'max_tokens' only if the model is a GPT4 vision model
    if model == MODEL_GPT_4_VISION:
        params["max_tokens"] = 4096
        params["temperature"] = 0

    stream = await client.chat.completions.create(**params)  # type: ignore
    full_response = ""
    async for chunk in stream:  # type: ignore
        assert isinstance(chunk, ChatCompletionChunk)
        content = chunk.choices[0].delta.content or ""
        full_response += content
        await callback(content)

    await client.close()

    return full_response
