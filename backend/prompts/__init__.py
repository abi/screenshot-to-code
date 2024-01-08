from typing import List, Literal, NoReturn, Union

from openai.types.chat import ChatCompletionMessageParam, ChatCompletionContentPartParam

from prompts.imported_code_prompts import (
    IMPORTED_CODE_BOOTSTRAP_SYSTEM_PROMPT,
    IMPORTED_CODE_IONIC_TAILWIND_SYSTEM_PROMPT,
    IMPORTED_CODE_REACT_TAILWIND_SYSTEM_PROMPT,
    IMPORTED_CODE_TAILWIND_SYSTEM_PROMPT,
    IMPORTED_CODE_SVG_SYSTEM_PROMPT,
)
from prompts.screenshot_system_prompts import (
    BOOTSTRAP_SYSTEM_PROMPT,
    IONIC_TAILWIND_SYSTEM_PROMPT,
    REACT_TAILWIND_SYSTEM_PROMPT,
    TAILWIND_SYSTEM_PROMPT,
    SVG_SYSTEM_PROMPT,
    VUE_TAILWIND_SYSTEM_PROMPT,
)


USER_PROMPT = """
Generate code for a web page that looks exactly like this.
"""

SVG_USER_PROMPT = """
Generate code for a SVG that looks exactly like this.
"""

Stack = Literal[
    "html_tailwind",
    "react_tailwind",
    "bootstrap",
    "ionic_tailwind",
    "vue_tailwind",
    "svg",
]


def assert_never(x: NoReturn) -> NoReturn:
    raise AssertionError(f"Stack is not one of available options: {x}")


def assemble_imported_code_prompt(
    code: str, stack: Stack, result_image_data_url: Union[str, None] = None
) -> List[ChatCompletionMessageParam]:
    system_content = IMPORTED_CODE_TAILWIND_SYSTEM_PROMPT
    if stack == "html_tailwind":
        system_content = IMPORTED_CODE_TAILWIND_SYSTEM_PROMPT
    elif stack == "react_tailwind":
        system_content = IMPORTED_CODE_REACT_TAILWIND_SYSTEM_PROMPT
    elif stack == "bootstrap":
        system_content = IMPORTED_CODE_BOOTSTRAP_SYSTEM_PROMPT
    elif stack == "ionic_tailwind":
        system_content = IMPORTED_CODE_IONIC_TAILWIND_SYSTEM_PROMPT
    elif stack == "vue_tailwind":
        # TODO: Fix this prompt to be vue tailwind
        system_content = IMPORTED_CODE_IONIC_TAILWIND_SYSTEM_PROMPT
    elif stack == "svg":
        system_content = IMPORTED_CODE_SVG_SYSTEM_PROMPT
    else:
        assert_never(stack)

    user_content = (
        "Here is the code of the app: " + code
        if stack != "svg"
        else "Here is the code of the SVG: " + code
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
    generated_code_config: Stack,
    result_image_data_url: Union[str, None] = None,
) -> List[ChatCompletionMessageParam]:
    # Set the system prompt based on the output settings
    system_content = TAILWIND_SYSTEM_PROMPT
    if generated_code_config == "html_tailwind":
        system_content = TAILWIND_SYSTEM_PROMPT
    elif generated_code_config == "react_tailwind":
        system_content = REACT_TAILWIND_SYSTEM_PROMPT
    elif generated_code_config == "bootstrap":
        system_content = BOOTSTRAP_SYSTEM_PROMPT
    elif generated_code_config == "ionic_tailwind":
        system_content = IONIC_TAILWIND_SYSTEM_PROMPT
    elif generated_code_config == "vue_tailwind":
        system_content = VUE_TAILWIND_SYSTEM_PROMPT
    elif generated_code_config == "svg":
        system_content = SVG_SYSTEM_PROMPT
    else:
        assert_never(generated_code_config)

    user_prompt = USER_PROMPT if generated_code_config != "svg" else SVG_USER_PROMPT

    user_content: List[ChatCompletionContentPartParam] = [
        {
            "type": "image_url",
            "image_url": {"url": image_data_url, "detail": "high"},
        },
        {
            "type": "text",
            "text": user_prompt,
        },
    ]

    # Include the result image if it exists
    if result_image_data_url:
        user_content.insert(
            1,
            {
                "type": "image_url",
                "image_url": {"url": result_image_data_url, "detail": "high"},
            },
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
