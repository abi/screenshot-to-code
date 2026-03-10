from typing import cast

from openai.types.chat import ChatCompletionContentPartParam, ChatCompletionMessageParam

from prompts.prompt_types import PromptHistoryMessage

Prompt = list[ChatCompletionMessageParam]


def _wrap_assistant_file_content(content: str, path: str = "index.html") -> str:
    stripped = content.strip()
    if stripped.startswith("<file ") and stripped.endswith("</file>"):
        return stripped
    return f'<file path="{path}">\n{stripped}\n</file>'


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
            "content": (
                _wrap_assistant_file_content(item.get("text", ""))
                if role == "assistant"
                else item.get("text", "")
            ),
        },
    )
