from typing import cast

from openai.types.chat import ChatCompletionMessageParam

from prompts import system_prompt
from prompts.prompt_types import UserTurnInput
from prompts.render import Prompt, build_history_message


def build_update_prompt_from_file_snapshot(
    prompt: UserTurnInput,
    file_state: dict[str, str],
) -> Prompt:
    return [
        cast(
            ChatCompletionMessageParam,
            {"role": "system", "content": system_prompt.SYSTEM_PROMPT},
        ),
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
        ),
    ]


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
