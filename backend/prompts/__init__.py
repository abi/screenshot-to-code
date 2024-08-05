from typing import Union
from openai.types.chat import ChatCompletionMessageParam, ChatCompletionContentPartParam

from custom_types import InputMode
from image_generation.core import create_alt_url_mapping
from prompts.imported_code_prompts import IMPORTED_CODE_SYSTEM_PROMPTS
from prompts.screenshot_system_prompts import SYSTEM_PROMPTS
from prompts.types import Stack
from video.utils import assemble_claude_prompt_video


USER_PROMPT = """
Generate code for a web page that looks exactly like this.
"""

SVG_USER_PROMPT = """
Generate code for a SVG that looks exactly like this.
"""


async def create_prompt(
    params: dict[str, str], stack: Stack, input_mode: InputMode
) -> tuple[list[ChatCompletionMessageParam], dict[str, str]]:

    image_cache: dict[str, str] = {}

    # If this generation started off with imported code, we need to assemble the prompt differently
    if params.get("isImportedFromCode"):
        original_imported_code = params["history"][0]
        prompt_messages = assemble_imported_code_prompt(original_imported_code, stack)
        for index, text in enumerate(params["history"][1:]):
            if index % 2 == 0:
                message: ChatCompletionMessageParam = {
                    "role": "user",
                    "content": text,
                }
            else:
                message: ChatCompletionMessageParam = {
                    "role": "assistant",
                    "content": text,
                }
            prompt_messages.append(message)
    else:
        # Assemble the prompt for non-imported code
        if params.get("resultImage"):
            prompt_messages = assemble_prompt(
                params["image"], stack, params["resultImage"]
            )
        else:
            prompt_messages = assemble_prompt(params["image"], stack)

        if params["generationType"] == "update":
            # Transform the history tree into message format
            # TODO: Move this to frontend
            for index, text in enumerate(params["history"]):
                if index % 2 == 0:
                    message: ChatCompletionMessageParam = {
                        "role": "assistant",
                        "content": text,
                    }
                else:
                    message: ChatCompletionMessageParam = {
                        "role": "user",
                        "content": text,
                    }
                prompt_messages.append(message)

            image_cache = create_alt_url_mapping(params["history"][-2])

    if input_mode == "video":
        video_data_url = params["image"]
        prompt_messages = await assemble_claude_prompt_video(video_data_url)

    return prompt_messages, image_cache


def assemble_imported_code_prompt(
    code: str, stack: Stack
) -> list[ChatCompletionMessageParam]:
    system_content = IMPORTED_CODE_SYSTEM_PROMPTS[stack]

    user_content = (
        "Here is the code of the app: " + code
        if stack != "svg"
        else "Here is the code of the SVG: " + code
    )

    return [
        {
            "role": "system",
            "content": system_content + "\n " + user_content,
        }
    ]
    # TODO: Use result_image_data_url


def assemble_prompt(
    image_data_url: str,
    stack: Stack,
    result_image_data_url: Union[str, None] = None,
) -> list[ChatCompletionMessageParam]:
    system_content = SYSTEM_PROMPTS[stack]
    user_prompt = USER_PROMPT if stack != "svg" else SVG_USER_PROMPT

    user_content: list[ChatCompletionContentPartParam] = [
        {
            "type": "image_url",
            "image_url": {"url": image_data_url, "detail": "high"},
        },
        {
            "type": "text",
            "text": user_prompt,
        },
    ]

    # Include the result image if it exists
    if result_image_data_url:
        user_content.insert(
            1,
            {
                "type": "image_url",
                "image_url": {"url": result_image_data_url, "detail": "high"},
            },
        )
    return [
        {
            "role": "system",
            "content": system_content,
        },
        {
            "role": "user",
            "content": user_content,
        },
    ]
