from typing import Any, cast

from openai.types.chat import ChatCompletionContentPartParam, ChatCompletionMessageParam

from custom_types import InputMode
from prompts.image_prompt_builder import build_image_prompt_messages
from prompts.prompt_types import PromptContent, Stack
from prompts import system_prompt
from prompts.text_prompt_builder import build_text_prompt_messages
from prompts.video_prompt_builder import build_video_prompt_messages

IMPORTED_CODE_INSTRUCTIONS = """
You are continuing from an imported codebase. Follow these instructions while updating it:

- Do not add comments in the code such as "<!-- Add other navigation links as needed -->" or "<!-- ... other news items ... -->" in place of writing the full code. WRITE THE FULL CODE.
- Repeat elements as needed. For example, if there are 15 items, the code should have 15 items. DO NOT LEAVE comments like "<!-- Repeat for each news item -->" or bad things will happen.
- For images, use placeholder images from https://placehold.co and include a detailed description of the image in the alt text so that an image generation AI can generate the image later.
"""


async def build_prompt_messages(
    stack: Stack,
    input_mode: InputMode,
    generation_type: str,
    prompt: PromptContent,
    history: list[dict[str, Any]],
    is_imported_from_code: bool,
) -> list[ChatCompletionMessageParam]:
    prompt_messages: list[ChatCompletionMessageParam] = []

    if is_imported_from_code:
        original_imported_code = history[0]["text"] if history else ""
        imported_user_prompt = resolve_imported_code_user_prompt(prompt, history)
        prompt_messages = build_imported_code_prompt_messages(
            original_imported_code,
            stack,
            imported_user_prompt,
        )
    else:
        if input_mode == "image":
            image_urls = prompt.get("images", [])
            text_prompt = prompt.get("text", "")
            prompt_messages = build_image_prompt_messages(
                image_data_urls=image_urls,
                stack=stack,
                text_prompt=text_prompt,
            )
        elif input_mode == "text":
            prompt_messages = build_text_prompt_messages(
                text_prompt=prompt["text"],
                stack=stack,
            )
        elif input_mode == "video":
            if generation_type == "create":
                video_urls = prompt.get("images", [])
                if not video_urls:
                    raise ValueError("Video mode requires a video to be provided")
                video_url = video_urls[0]
                prompt_messages = build_video_prompt_messages(
                    video_data_url=video_url,
                    stack=stack,
                    text_prompt=prompt.get("text", ""),
                )
            else:
                prompt_messages = [
                    cast(
                        ChatCompletionMessageParam,
                        {"role": "system", "content": system_prompt.SYSTEM_PROMPT},
                    )
                ]
        else:
            image_urls = prompt.get("images", [])
            text_prompt = prompt.get("text", "")
            prompt_messages = build_image_prompt_messages(
                image_data_urls=image_urls,
                stack=stack,
                text_prompt=text_prompt,
            )

        if generation_type == "update":
            for index, item in enumerate(history):
                role = "assistant" if index % 2 == 0 else "user"
                message = build_history_message(item, role)
                prompt_messages.append(message)

    return prompt_messages


def build_history_message(
    item: dict[str, Any], role: str
) -> ChatCompletionMessageParam:
    if role == "user" and item.get("images") and len(item["images"]) > 0:
        user_content: list[ChatCompletionContentPartParam] = []

        for image_url in item["images"]:
            user_content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": image_url, "detail": "high"},
                }
            )

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

    return cast(
        ChatCompletionMessageParam,
        {
            "role": role,
            "content": item["text"],
        },
    )


def build_imported_code_prompt_messages(
    code: str,
    stack: Stack,
    user_prompt: PromptContent,
) -> list[ChatCompletionMessageParam]:
    system_content = (
        system_prompt.SYSTEM_PROMPT.strip()
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
        build_history_message(
            {
                "text": user_prompt.get("text", ""),
                "images": user_prompt.get("images", []),
            },
            "user",
        ),
    ]


def resolve_imported_code_user_prompt(
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

    if prompt_text.strip():
        return {
            "text": prompt_text,
            "images": normalized_prompt_images,
        }

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

    if normalized_prompt_images:
        return {
            "text": "",
            "images": normalized_prompt_images,
        }

    return {
        "text": "Update the imported code according to the latest request.",
        "images": [],
    }
