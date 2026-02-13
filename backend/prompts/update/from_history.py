from typing import cast

from openai.types.chat import ChatCompletionMessageParam

from prompts import system_prompt
from prompts.prompt_types import PromptHistoryMessage
from prompts.render import Prompt, build_history_message


def build_update_prompt_from_history(
    history: list[PromptHistoryMessage],
) -> Prompt:
    prompt_messages: Prompt = [
        cast(
            ChatCompletionMessageParam,
            {"role": "system", "content": system_prompt.SYSTEM_PROMPT},
        )
    ]
    for item in history:
        prompt_messages.append(build_history_message(item))
    return prompt_messages
