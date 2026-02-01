from typing import Union, Any, cast
from openai.types.chat import ChatCompletionMessageParam, ChatCompletionContentPartParam

from custom_types import InputMode
from image_generation.core import create_alt_url_mapping
from prompts.imported_code_prompts import IMPORTED_CODE_SYSTEM_PROMPTS
from prompts.screenshot_system_prompts import SYSTEM_PROMPTS
from prompts.text_prompts import SYSTEM_PROMPTS as TEXT_SYSTEM_PROMPTS
from prompts.types import Stack, PromptContent


USER_PROMPT = """
Generate code for a web page that looks exactly like the provided screenshot(s).
If multiple screenshots are provided, organize them meaningfully. If they appear to be
different pages in a website, make them distinct pages and link them. If they look like
different tabs or views in an app, connect them with appropriate navigation. If they
appear unrelated, create a scaffold that separates them into "Screenshot 1", "Screenshot 2",
"Screenshot 3", etc. so it is easy to navigate.
For mobile screenshots, do not include the device frame or browser chrome; focus only on
the actual UI mockups.
"""

SVG_USER_PROMPT = """
Generate code for a SVG that looks exactly like the provided screenshot(s).
"""


async def create_prompt(
    stack: Stack,
    input_mode: InputMode,
    generation_type: str,
    prompt: PromptContent,
    history: list[dict[str, Any]],
    is_imported_from_code: bool,
) -> tuple[list[ChatCompletionMessageParam], dict[str, str]]:

    image_cache: dict[str, str] = {}

    # If this generation started off with imported code, we need to assemble the prompt differently
    if is_imported_from_code:
        original_imported_code = history[0]["text"]
        prompt_messages = assemble_imported_code_prompt(original_imported_code, stack)
        for index, item in enumerate(history[1:]):
            role = "user" if index % 2 == 0 else "assistant"
            message = create_message_from_history_item(item, role)
            prompt_messages.append(message)
    else:
        # Assemble the prompt for non-imported code
        if input_mode == "image":
            image_urls = prompt.get("images", [])
            text_prompt = prompt.get("text", "")
            prompt_messages = assemble_prompt(image_urls, stack, text_prompt)
        elif input_mode == "text":
            prompt_messages = assemble_text_prompt(prompt["text"], stack)
        elif input_mode == "video":
            # For video mode initial creation, prompt is handled by VideoGenerationStage
            # which sends the video directly to Gemini with its own prompt
            if generation_type == "create":
                # Return empty prompt - actual generation is handled by VideoGenerationStage
                prompt_messages = []
            else:
                # For video mode updates, use the screenshot system prompt
                # since we're now working with the generated code, not the video
                prompt_messages = [
                    {
                        "role": "system",
                        "content": SYSTEM_PROMPTS[stack],
                    }
                ]
        else:
            # Default to image mode for backward compatibility
            image_urls = prompt.get("images", [])
            text_prompt = prompt.get("text", "")
            prompt_messages = assemble_prompt(image_urls, stack, text_prompt)

        if generation_type == "update":
            # Transform the history tree into message format
            for index, item in enumerate(history):
                role = "assistant" if index % 2 == 0 else "user"
                message = create_message_from_history_item(item, role)
                prompt_messages.append(message)

            image_cache = create_alt_url_mapping(history[-2]["text"])

    return prompt_messages, image_cache


def create_message_from_history_item(
    item: dict[str, Any], role: str
) -> ChatCompletionMessageParam:
    """
    Create a ChatCompletionMessageParam from a history item.
    Handles both text-only and text+images content.
    """
    # Check if this is a user message with images
    if role == "user" and item.get("images") and len(item["images"]) > 0:
        # Create multipart content for user messages with images
        user_content: list[ChatCompletionContentPartParam] = []

        # Add all images first
        for image_url in item["images"]:
            user_content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": image_url, "detail": "high"},
                }
            )

        # Add text content
        user_content.append(
            {
                "type": "text",
                "text": item["text"],
            }
        )

        return cast(
            ChatCompletionMessageParam,
            {
                "role": role,
                "content": user_content,
            },
        )
    else:
        # Regular text-only message
        return cast(
            ChatCompletionMessageParam,
            {
                "role": role,
                "content": item["text"],
            },
        )


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


def assemble_prompt(
    image_data_urls: list[str],
    stack: Stack,
    text_prompt: str = "",
) -> list[ChatCompletionMessageParam]:
    system_content = SYSTEM_PROMPTS[stack]
    user_prompt = USER_PROMPT if stack != "svg" else SVG_USER_PROMPT

    # Append optional text instructions if provided
    if text_prompt.strip():
        user_prompt = user_prompt.strip() + "\n\nAdditional instructions: " + text_prompt

    user_content: list[ChatCompletionContentPartParam] = []
    for image_data_url in image_data_urls:
        user_content.append(
            {
                "type": "image_url",
                "image_url": {"url": image_data_url, "detail": "high"},
            }
        )
    user_content.append(
        {
            "type": "text",
            "text": user_prompt,
        }
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


def assemble_text_prompt(
    text_prompt: str,
    stack: Stack,
) -> list[ChatCompletionMessageParam]:

    system_content = TEXT_SYSTEM_PROMPTS[stack]

    return [
        {
            "role": "system",
            "content": system_content,
        },
        {
            "role": "user",
            "content": "Generate UI for " + text_prompt,
        },
    ]
