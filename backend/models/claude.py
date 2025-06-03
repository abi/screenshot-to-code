import copy
import time
from typing import Any, Awaitable, Callable, Dict, List, Tuple, cast
from anthropic import AsyncAnthropic
from openai.types.chat import ChatCompletionMessageParam
from config import IS_DEBUG_ENABLED
from debug.DebugFileWriter import DebugFileWriter
from image_processing.utils import process_image
from utils import pprint_prompt
from llm import Completion, Llm


def convert_openai_messages_to_claude(
    messages: List[ChatCompletionMessageParam],
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Convert OpenAI format messages to Claude format, handling image content properly.

    Args:
        messages: List of messages in OpenAI format

    Returns:
        Tuple of (system_prompt, claude_messages)
    """
    # Deep copy messages to avoid modifying the original list
    cloned_messages = copy.deepcopy(messages)

    system_prompt = cast(str, cloned_messages[0].get("content"))
    claude_messages = [dict(message) for message in cloned_messages[1:]]

    for message in claude_messages:
        if not isinstance(message["content"], list):
            continue

        for content in message["content"]:  # type: ignore
            if content["type"] == "image_url":
                content["type"] = "image"

                # Extract base64 data and media type from data URL
                # Example base64 data URL: data:image/png;base64,iVBOR...
                image_data_url = cast(str, content["image_url"]["url"])

                # Process image and split media type and data
                # so it works with Claude (under 5mb in base64 encoding)
                (media_type, base64_data) = process_image(image_data_url)

                # Remove OpenAI parameter
                del content["image_url"]

                content["source"] = {
                    "type": "base64",
                    "media_type": media_type,
                    "data": base64_data,
                }

    return system_prompt, claude_messages


async def stream_claude_response(
    messages: List[ChatCompletionMessageParam],
    api_key: str,
    callback: Callable[[str], Awaitable[None]],
    model_name: str,
) -> Completion:
    start_time = time.time()
    client = AsyncAnthropic(api_key=api_key)

    # Base parameters
    max_tokens = 8192
    temperature = 0.0

    # Claude 3.7 Sonnet can support higher max tokens
    if model_name == "claude-3-7-sonnet-20250219":
        max_tokens = 20000

    # Translate OpenAI messages to Claude messages

    # Convert OpenAI format messages to Claude format
    system_prompt, claude_messages = convert_openai_messages_to_claude(messages)

    response = ""

    if (
        model_name == Llm.CLAUDE_4_SONNET_2025_05_14.value
        or model_name == Llm.CLAUDE_4_OPUS_2025_05_14.value
    ):
        print(f"Using {model_name} with thinking")
        # Thinking is not compatible with temperature
        async with client.messages.stream(
            model=model_name,
            thinking={"type": "enabled", "budget_tokens": 10000},
            max_tokens=30000,
            system=system_prompt,
            messages=claude_messages,  # type: ignore
        ) as stream:
            async for event in stream:
                if event.type == "content_block_delta":
                    if event.delta.type == "thinking_delta":
                        pass
                        # print(event.delta.thinking, end="")
                    elif event.delta.type == "text_delta":
                        response += event.delta.text
                        await callback(event.delta.text)

    else:
        # Stream Claude response
        async with client.beta.messages.stream(
            model=model_name,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt,
            messages=claude_messages,  # type: ignore
            betas=["output-128k-2025-02-19"],
        ) as stream:
            async for text in stream.text_stream:
                response += text
                await callback(text)

    # Close the Anthropic client
    await client.close()

    completion_time = time.time() - start_time
    return {"duration": completion_time, "code": response}


async def stream_claude_response_native(
    system_prompt: str,
    messages: list[Any],
    api_key: str,
    callback: Callable[[str], Awaitable[None]],
    include_thinking: bool = False,
    model_name: str = "claude-3-7-sonnet-20250219",
) -> Completion:
    start_time = time.time()
    client = AsyncAnthropic(api_key=api_key)

    # Base model parameters
    max_tokens = 4096
    temperature = 0.0

    # Multi-pass flow
    current_pass_num = 1
    max_passes = 2

    prefix = "<thinking>"
    response = None

    # For debugging
    full_stream = ""
    debug_file_writer = DebugFileWriter()

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
            model=model_name,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt,
            messages=messages_to_send,  # type: ignore
        ) as stream:
            async for text in stream.text_stream:
                print(text, end="", flush=True)
                full_stream += text
                await callback(text)

        response = await stream.get_final_message()
        response_text = response.content[0].text

        # Write each pass's code to .html file and thinking to .txt file
        if IS_DEBUG_ENABLED:
            debug_file_writer.write_to_file(
                f"pass_{current_pass_num - 1}.html",
                debug_file_writer.extract_html_content(response_text),
            )
            debug_file_writer.write_to_file(
                f"thinking_pass_{current_pass_num - 1}.txt",
                response_text.split("</thinking>")[0],
            )

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

    # Close the Anthropic client
    await client.close()

    completion_time = time.time() - start_time

    if IS_DEBUG_ENABLED:
        debug_file_writer.write_to_file("full_stream.txt", full_stream)

    if not response:
        raise Exception("No HTML response found in AI response")
    else:
        return {
            "duration": completion_time,
            "code": response.content[0].text,  # type: ignore
        }
