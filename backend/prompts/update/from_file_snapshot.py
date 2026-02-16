from typing import cast

from openai.types.chat import ChatCompletionMessageParam

from prompts import system_prompt
from prompts.policies import build_selected_stack_policy, build_user_image_policy
from prompts.prompt_types import Stack, UserTurnInput
from prompts.message_builder import Prompt, build_history_message


def build_update_prompt_from_file_snapshot(
    stack: Stack,
    prompt: UserTurnInput,
    file_state: dict[str, str],
    image_generation_enabled: bool,
) -> Prompt:
    path = file_state.get("path", "index.html")
    request_text = prompt.get("text", "").strip() or "Apply the requested update."
    selected_stack = build_selected_stack_policy(stack)
    image_policy = build_user_image_policy(image_generation_enabled)
    bootstrap_text = f"""{selected_stack}

{image_policy}

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
