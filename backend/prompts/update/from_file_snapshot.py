from typing import cast

from openai.types.chat import ChatCompletionMessageParam

from prompts import system_prompt
from prompts.prompt_types import Stack, UserTurnInput
from prompts.message_builder import Prompt, build_history_message


def build_update_prompt_from_file_snapshot(
    stack: Stack,
    prompt: UserTurnInput,
    file_state: dict[str, str],
) -> Prompt:
    path = file_state.get("path", "index.html")
    request_text = prompt.get("text", "").strip() or "Apply the requested update."
    bootstrap_text = f"""Selected stack: {stack}.

You are editing an existing file.

<current_file path="{path}">
{file_state["content"]}
</current_file>

<change_request>
{request_text}
</change_request>"""
    return [
        cast(
            ChatCompletionMessageParam,
            {
                "role": "system",
                "content": system_prompt.SYSTEM_PROMPT,
            },
        ),
        build_history_message(
            {
                "role": "user",
                "text": bootstrap_text,
                "images": prompt.get("images", []),
                "videos": prompt.get("videos", []),
            }
        ),
    ]
