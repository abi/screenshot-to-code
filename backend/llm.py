from typing import Any, Awaitable, Callable, List, cast
from anthropic import AsyncAnthropic
from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam, ChatCompletionChunk

from utils import pprint_prompt

MODEL_GPT_4_VISION = "gpt-4-vision-preview"
MODEL_CLAUDE_SONNET = "claude-3-sonnet-20240229"
MODEL_CLAUDE_OPUS = "claude-3-opus-20240229"


# Keep in sync with frontend (lib/models.ts)
CODE_GENERATION_MODELS = [
    "gpt_4_vision",
    "claude_3_sonnet",
]


async def stream_openai_response(
    messages: List[ChatCompletionMessageParam],
    api_key: str,
    base_url: str | None,
    callback: Callable[[str], Awaitable[None]],
) -> str:
    client = AsyncOpenAI(api_key=api_key, base_url=base_url)

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


# TODO: Have a seperate function that translates OpenAI messages to Claude messages
async def stream_claude_response(
    messages: List[ChatCompletionMessageParam],
    api_key: str,
    callback: Callable[[str], Awaitable[None]],
) -> str:

    client = AsyncAnthropic(api_key=api_key)

    # Base parameters
    model = MODEL_CLAUDE_SONNET
    max_tokens = 4096
    temperature = 0.0

    # Translate OpenAI messages to Claude messages
    system_prompt = cast(str, messages[0]["content"])
    claude_messages = [dict(message) for message in messages[1:]]
    for message in claude_messages:
        if not isinstance(message["content"], list):
            continue

        for content in message["content"]:  # type: ignore
            if content["type"] == "image_url":
                content["type"] = "image"

                # Extract base64 data and media type from data URL
                # Example base64 data URL: data:image/png;base64,iVBOR...
                image_data_url = cast(str, content["image_url"]["url"])
                media_type = image_data_url.split(";")[0].split(":")[1]
                base64_data = image_data_url.split(",")[1]

                # Remove OpenAI parameter
                del content["image_url"]

                content["source"] = {
                    "type": "base64",
                    "media_type": media_type,
                    "data": base64_data,
                }

    # Stream Claude response
    async with client.messages.stream(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        system=system_prompt,
        messages=claude_messages,  # type: ignore
    ) as stream:
        async for text in stream.text_stream:
            await callback(text)

    # Return final message
    response = await stream.get_final_message()
    return response.content[0].text


async def stream_claude_response_native(
    system_prompt: str,
    messages: list[Any],
    api_key: str,
    callback: Callable[[str], Awaitable[None]],
    include_thinking: bool = False,
    model: str = MODEL_CLAUDE_OPUS,
) -> str:

    client = AsyncAnthropic(api_key=api_key)

    # Base model parameters
    max_tokens = 4096
    temperature = 0.0

    # Multi-pass flow
    current_pass_num = 1
    max_passes = 2

    prefix = "<thinking>"
    response = None

    while current_pass_num <= max_passes:
        current_pass_num += 1

        # Set up message depending on whether we have a <thinking> prefix
        messages_to_send = (
            messages + [{"role": "assistant", "content": prefix}]
            if include_thinking
            else messages
        )

        pprint_prompt(messages_to_send)

        async with client.messages.stream(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt,
            messages=messages_to_send,  # type: ignore
        ) as stream:
            async for text in stream.text_stream:
                print(text, end="", flush=True)
                await callback(text)

        # Return final message
        response = await stream.get_final_message()

        # Set up messages array for next pass
        messages += [
            {"role": "assistant", "content": str(prefix) + response.content[0].text},
            {
                "role": "user",
                "content": "You've done a good job with a first draft. Improve this further based on the original instructions so that the app is fully functional and looks like the original video of the app we're trying to replicate.",
            },
        ]

        print(
            f"Token usage: Input Tokens: {response.usage.input_tokens}, Output Tokens: {response.usage.output_tokens}"
        )

    if not response:
        raise Exception("No HTML response found in AI response")
    else:
        return response.content[0].text
