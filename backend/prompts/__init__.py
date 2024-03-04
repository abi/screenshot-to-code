from typing import List, Literal, Optional, Union

from openai.types.chat import ChatCompletionMessageParam, ChatCompletionContentPartParam
from prompts.imported_code_prompts import IMPORTED_CODE_SYSTEM_PROMPTS
from prompts.screenshot_system_prompts import SYSTEM_PROMPTS
from prompts.types import Stack

USER_PROMPT: Literal["Generate code for a web page that looks exactly like this."] = (
    "Generate code for a web page that looks exactly like this."
)
SVG_USER_PROMPT: Literal[
    "Generate code for a SVG that looks exactly like this."
] = "Generate code for a SVG that looks exactly like this."

STACK_TO_SYSTEM_CONTENT: dict[Stack, str] = {
    "web": "You are a helpful assistant that generates code for a web page.",
    "svg": "You are a helpful assistant that generates code for a SVG.",
}

STACK_TO_USER_PROMPT: dict[Stack, str] = {
    "web": "Generate code for a web page that looks exactly like this.",
    "svg": "Generate code for a SVG that looks exactly like this.",
}

def assemble_imported_code_prompt(
    code: str, stack: Stack, result_image_data_url: Optional[str] = None
) -> List[ChatCompletionMessageParam]:
    system_content = STACK_TO_SYSTEM_CONTENT[stack]
    user_content = (
        f"Here is the code of the app: {code}" if stack != "svg" else f"Here is the code of the SVG: {code}"
    )
    return [
        {
            "role": "system",
            "content": system_content,
        },
        {
            "role": "user",
            "content": user_content,
        },
    ]
    # TODO: Use result_image_data_url

def assemble_prompt(
    image_data_url: str,
    stack: Stack,
    result_image_data_url: Optional[str] = None,
) -> List[ChatCompletionMessageParam]:
    system_content = STACK_TO_SYSTEM_CONTENT[stack]
    user_prompt = STACK_TO_USER_PROMPT[stack]

    user_content = [
        {
            "type": "image_url",
            "image_url": {"url": image_data_url, "detail": "high"},
