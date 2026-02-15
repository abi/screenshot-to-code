from typing import cast

from openai.types.chat import ChatCompletionMessageParam

from prompts import system_prompt
from prompts.prompt_types import PromptHistoryMessage, Stack
from prompts.message_builder import Prompt, build_history_message


def build_update_prompt_from_history(
    stack: Stack,
    history: list[PromptHistoryMessage],
) -> Prompt:
    first_user_index = next(
        (index for index, item in enumerate(history) if item["role"] == "user"),
        -1,
    )
    if first_user_index == -1:
        raise ValueError("Update history must include at least one user message")

    prompt_messages: Prompt = [
        cast(
            ChatCompletionMessageParam,
            {
                "role": "system",
                "content": system_prompt.SYSTEM_PROMPT,
            },
        )
    ]
    for index, item in enumerate(history):
        if index == first_user_index:
            stack_prefix = f"Selected stack: {stack}."
            user_text = item.get("text", "")
            prefixed_text = (
                f"{stack_prefix}\n\n{user_text}" if user_text.strip() else stack_prefix
            )
            prompt_messages.append(
                build_history_message(
                    {
                        "role": "user",
                        "text": prefixed_text,
                        "images": item.get("images", []),
                        "videos": item.get("videos", []),
                    }
                )
            )
            continue

        prompt_messages.append(build_history_message(item))

    return prompt_messages
