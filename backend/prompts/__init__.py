from typing import Any, cast
from openai.types.chat import ChatCompletionMessageParam, ChatCompletionContentPartParam

from custom_types import InputMode
from prompts.screenshot_system_prompts import SYSTEM_PROMPT
from prompts.video_prompts import GEMINI_VIDEO_PROMPT
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

IMPORTED_CODE_INSTRUCTIONS = """
You are continuing from an imported codebase. Follow these instructions while updating it:

- Do not add comments in the code such as "<!-- Add other navigation links as needed -->" or "<!-- ... other news items ... -->" in place of writing the full code. WRITE THE FULL CODE.
- Repeat elements as needed. For example, if there are 15 items, the code should have 15 items. DO NOT LEAVE comments like "<!-- Repeat for each news item -->" or bad things will happen.
- For images, use placeholder images from https://placehold.co and include a detailed description of the image in the alt text so that an image generation AI can generate the image later.
"""


async def create_prompt(
    stack: Stack,
    input_mode: InputMode,
    generation_type: str,
    prompt: PromptContent,
    history: list[dict[str, Any]],
    is_imported_from_code: bool,
) -> list[ChatCompletionMessageParam]:

    prompt_messages: list[ChatCompletionMessageParam] = []

    # If this generation started off with imported code, we need to assemble the prompt differently
    if is_imported_from_code:
        original_imported_code = history[0]["text"] if history else ""
        imported_user_prompt = get_imported_code_user_prompt(prompt, history)
        prompt_messages = assemble_imported_code_prompt(
            original_imported_code,
            stack,
            imported_user_prompt,
        )
    else:
        # Assemble the prompt for non-imported code
        if input_mode == "image":
            image_urls = prompt.get("images", [])
            text_prompt = prompt.get("text", "")
            prompt_messages = assemble_prompt(image_urls, stack, text_prompt)
        elif input_mode == "text":
            prompt_messages = assemble_text_prompt(prompt["text"], stack)
        elif input_mode == "video":
            if generation_type == "create":
                video_urls = prompt.get("images", [])
                if not video_urls:
                    raise ValueError("Video mode requires a video to be provided")
                video_url = video_urls[0]
                prompt_messages = assemble_video_prompt(
                    video_data_url=video_url,
                    text_prompt=prompt.get("text", ""),
                )
            else:
                # For video mode updates, use the screenshot system prompt
                # since we're now working with the generated code, not the video
                prompt_messages = [
                    cast(
                        ChatCompletionMessageParam,
                        {
                            "role": "system",
                            "content": SYSTEM_PROMPT,
                        },
                    )
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

    return prompt_messages


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
    code: str,
    stack: Stack,
    user_prompt: PromptContent,
) -> list[ChatCompletionMessageParam]:
    system_content = (
        SYSTEM_PROMPT.strip()
        + "\n\n"
        + IMPORTED_CODE_INSTRUCTIONS.strip()
        + f"\n\nSelected stack: {stack}."
        + "\n\nThe current app code is provided below. Update it per the request."
        + f"\n\n{code}"
    )

    return [
        {
            "role": "system",
            "content": system_content,
        },
        create_message_from_history_item(
            {
                "text": user_prompt.get("text", ""),
                "images": user_prompt.get("images", []),
            },
            "user",
        ),
    ]


def get_imported_code_user_prompt(
    prompt: PromptContent,
    history: list[dict[str, Any]],
) -> PromptContent:
    prompt_text = prompt.get("text", "")
    prompt_images = prompt.get("images", [])
    normalized_prompt_images: list[str] = []
    if isinstance(prompt_images, list):
        raw_prompt_images = cast(list[object], prompt_images)
        for image in raw_prompt_images:
            if isinstance(image, str):
                normalized_prompt_images.append(image)

    # Preferred path: if prompt has text, treat it as the latest user instruction.
    if prompt_text.strip():
        return {
            "text": prompt_text,
            "images": normalized_prompt_images,
        }

    # Backward-compatibility path: recover latest user turn from imported-code history.
    for index in range(len(history) - 1, 0, -1):
        if index % 2 == 1:
            item = history[index]
            text = item.get("text", "")
            images = item.get("images", [])
            normalized_images: list[str] = []
            if isinstance(images, list):
                raw_images = cast(list[object], images)
                for image in raw_images:
                    if isinstance(image, str):
                        normalized_images.append(image)
            return {
                "text": text if isinstance(text, str) else "",
                "images": normalized_images,
            }

    # Final fallback: if prompt only has images, keep them so visual references are not lost.
    if normalized_prompt_images:
        return {
            "text": "",
            "images": normalized_prompt_images,
        }

    return {
        "text": "Update the imported code according to the latest request.",
        "images": [],
    }


def assemble_prompt(
    image_data_urls: list[str],
    stack: Stack,
    text_prompt: str = "",
) -> list[ChatCompletionMessageParam]:
    system_content = SYSTEM_PROMPT
    user_prompt = USER_PROMPT.strip() + f"\n\nSelected stack: {stack}"

    # Append optional text instructions if provided
    if text_prompt.strip():
        user_prompt = user_prompt + "\n\nAdditional instructions: " + text_prompt

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

    return [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        },
        {
            "role": "user",
            "content": f"""
            - Make sure to make it look modern and sleek.
            - Use modern, professional fonts and colors.
            - Follow UX best practices.
            Selected stack: {stack}.
            Generate UI for {text_prompt}.
            """,
        },
    ]


def assemble_video_prompt(
    video_data_url: str,
    text_prompt: str = "",
) -> list[ChatCompletionMessageParam]:
    user_text = "Analyze this video and generate the code."
    if text_prompt.strip():
        user_text = user_text + "\n\nAdditional instructions: " + text_prompt

    user_content: list[ChatCompletionContentPartParam] = [
        {
            "type": "image_url",
            "image_url": {"url": video_data_url, "detail": "high"},
        },
        {
            "type": "text",
            "text": user_text,
        },
    ]

    return [
        {
            "role": "system",
            "content": GEMINI_VIDEO_PROMPT,
        },
        {
            "role": "user",
            "content": user_content,
        },
    ]
