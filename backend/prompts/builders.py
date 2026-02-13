from typing import cast

from openai.types.chat import ChatCompletionContentPartParam, ChatCompletionMessageParam

from custom_types import InputMode
from prompts.image_prompt_builder import build_image_prompt_messages
from prompts.prompt_types import PromptContent, PromptHistoryMessage, Stack
from prompts import system_prompt
from prompts.text_prompt_builder import build_text_prompt_messages
from prompts.video_prompt_builder import build_video_prompt_messages

async def build_prompt_messages(
    stack: Stack,
    input_mode: InputMode,
    generation_type: str,
    prompt: PromptContent,
    history: list[PromptHistoryMessage],
    file_state: dict[str, str] | None = None,
) -> list[ChatCompletionMessageParam]:
    prompt_messages: list[ChatCompletionMessageParam] = []

    if generation_type == "update":
        prompt_messages = [
            cast(
                ChatCompletionMessageParam,
                {"role": "system", "content": system_prompt.SYSTEM_PROMPT},
            )
        ]
        if len(history) > 0:
            for item in history:
                prompt_messages.append(build_history_message(item))
        elif file_state and file_state.get("content", "").strip():
            prompt_messages.append(
                build_history_message(
                    {
                        "role": "user",
                        "text": build_update_bootstrap_prompt_text(
                            path=file_state.get("path", "index.html"),
                            current_code=file_state["content"],
                            instruction=prompt.get("text", ""),
                        ),
                        "images": prompt.get("images", []),
                        "videos": prompt.get("videos", []),
                    }
                )
            )
        else:
            raise ValueError("Update requests require history or fileState.content")
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


def build_update_bootstrap_prompt_text(
    path: str,
    current_code: str,
    instruction: str,
) -> str:
    request_text = instruction.strip() or "Apply the requested update."
    return (
        "You are editing an existing file.\n\n"
        f'<current_file path="{path}">\n'
        f"{current_code}\n"
        "</current_file>\n\n"
        "<change_request>\n"
        f"{request_text}\n"
        "</change_request>"
    )


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
