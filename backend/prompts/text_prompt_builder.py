from openai.types.chat import ChatCompletionMessageParam

from prompts.prompt_types import Stack
from prompts import system_prompt


def build_text_prompt_messages(
    text_prompt: str,
    stack: Stack,
) -> list[ChatCompletionMessageParam]:

    USER_PROMPT = f"""
Generate UI for {text_prompt}.
Selected stack: {stack}.

# Instructions

- Make sure to make it look modern and sleek.
- Use modern, professional fonts and colors.
- Follow UX best practices."""

    return [
        {
            "role": "system",
            "content": system_prompt.SYSTEM_PROMPT,
        },
        {
            "role": "user",
            "content": USER_PROMPT,
        },
    ]
