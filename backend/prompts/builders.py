from typing import cast

from openai.types.chat import ChatCompletionContentPartParam, ChatCompletionMessageParam

from custom_types import InputMode
from prompts.image_prompt_builder import build_image_prompt_messages
from prompts.prompt_types import PromptContent, PromptHistoryMessage, Stack
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
    history: list[PromptHistoryMessage],
    is_imported_from_code: bool,
) -> list[ChatCompletionMessageParam]:
    prompt_messages: list[ChatCompletionMessageParam] = []

    if is_imported_from_code:
        original_imported_code = ""
        for message in history:
            if message["role"] == "assistant":
                original_imported_code = message["text"]
                break
        imported_user_prompt = resolve_imported_code_user_prompt(prompt, history)
        prompt_messages = build_imported_code_prompt_messages(
            original_imported_code,
            stack,
            imported_user_prompt,
        )
    elif generation_type == "update":
        prompt_messages = [
            cast(
                ChatCompletionMessageParam,
                {"role": "system", "content": system_prompt.SYSTEM_PROMPT},
            )
        ]
        for item in history:
            prompt_messages.append(build_history_message(item))
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
            video_urls = prompt.get("videos", [])
            if not video_urls:
                # Backward compatibility for older frontend payloads.
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
            image_urls = prompt.get("images", [])
            text_prompt = prompt.get("text", "")
            prompt_messages = build_image_prompt_messages(
                image_data_urls=image_urls,
                stack=stack,
                text_prompt=text_prompt,
            )

    return prompt_messages


def build_history_message(item: PromptHistoryMessage) -> ChatCompletionMessageParam:
    role = item["role"]
    image_urls = item.get("images", [])
    video_urls = item.get("videos", [])
    media_urls = [*image_urls, *video_urls]

    if role == "user" and len(media_urls) > 0:
        user_content: list[ChatCompletionContentPartParam] = []

        for media_url in media_urls:
            user_content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": media_url, "detail": "high"},
                }
            )

        user_content.append(
            {
                "type": "text",
                "text": item.get("text", ""),
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
            "content": item.get("text", ""),
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
                "role": "user",
                "text": user_prompt.get("text", ""),
                "images": user_prompt.get("images", []),
                "videos": user_prompt.get("videos", []),
            }
        ),
    ]


def resolve_imported_code_user_prompt(
    prompt: PromptContent,
    history: list[PromptHistoryMessage],
) -> PromptContent:
    prompt_text = prompt.get("text", "")
    prompt_images = prompt.get("images", [])
    prompt_videos = prompt.get("videos", [])

    if prompt_text.strip():
        return {
            "text": prompt_text,
            "images": prompt_images,
            "videos": prompt_videos,
        }

    for item in reversed(history):
        if item["role"] == "user":
            return {
                "text": item["text"],
                "images": item.get("images", []),
                "videos": item.get("videos", []),
            }

    if prompt_images or prompt_videos:
        return {
            "text": "",
            "images": prompt_images,
            "videos": prompt_videos,
        }

    return {
        "text": "Update the imported code according to the latest request.",
        "images": [],
        "videos": [],
    }
