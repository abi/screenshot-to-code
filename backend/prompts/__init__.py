from typing import List, NoReturn, Union

from openai.types.chat import ChatCompletionMessageParam, ChatCompletionContentPartParam

from prompts.imported_code_prompts import IMPORTED_CODE_SYSTEM_PROMPTS
from prompts.screenshot_system_prompts import SYSTEM_PROMPTS
from prompts.types import Stack


USER_PROMPT = """
Generate code for a web page that looks exactly like this.
"""

SVG_USER_PROMPT = """
Generate code for a SVG that looks exactly like this.
"""

TAILWIND_USER_PROMPT = """
Incorporate the below given Tailwind CSS configuration into your project to customize its appearance. The configuration may have the custom fonts, colours, sizes, spacing which can be used to match the original image. Also add the configuration in the following way:
<script>
    tailwind.config = {
        // Add the configuration here
    }
  </script>

The configuration is: 
"""


def assemble_imported_code_prompt(
    code: str,
    stack: Stack,
    tailwind_config: Union[str, None],
    result_image_data_url: Union[str, None] = None,
) -> List[ChatCompletionMessageParam]:
            
    system_content = IMPORTED_CODE_SYSTEM_PROMPTS[stack]

    user_content: List[ChatCompletionContentPartParam] = [
        {
            "type": "text",
            "text": (
                "Here is the code of the app: " + code
                if stack != "svg"
                else "Here is the code of the SVG: " + code
            ),
        },
    ]

    if tailwind_config is not None:
        user_content.insert(
            1,
            {
                "type": "text",
                "text": TAILWIND_USER_PROMPT + tailwind_config,
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
    # TODO: Use result_image_data_url


def assemble_prompt(
    image_data_url: str,
    stack: Stack,
    tailwind_config: Union[str, None],
    result_image_data_url: Union[str, None] = None,
) -> List[ChatCompletionMessageParam]:
        
    system_content = SYSTEM_PROMPTS[stack]
    user_prompt = USER_PROMPT if stack != "svg" else SVG_USER_PROMPT

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
    
    if tailwind_config is not None:
        user_content.insert(
            2,
            {
                "type": "text",
                "text": TAILWIND_USER_PROMPT + tailwind_config,
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
