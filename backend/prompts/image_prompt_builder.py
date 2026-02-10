from openai.types.chat import ChatCompletionContentPartParam, ChatCompletionMessageParam

from prompts.prompt_types import Stack
from prompts import system_prompt

def build_image_prompt_messages(
    image_data_urls: list[str],
    stack: Stack,
    text_prompt: str,
) -> list[ChatCompletionMessageParam]:
    user_prompt = f"""
Generate code for a web page that looks exactly like the provided screenshot(s).
If multiple screenshots are provided, organize them meaningfully. If they appear to be
different pages in a website, make them distinct pages and link them. If they look like
different tabs or views in an app, connect them with appropriate navigation. If they
appear unrelated, create a scaffold that separates them into "Screenshot 1", "Screenshot 2",
"Screenshot 3", etc. so it is easy to navigate.
For mobile screenshots, do not include the device frame or browser chrome; focus only on
the actual UI mockups.

Selected stack: {stack}
""".strip()

    if text_prompt.strip():
        user_prompt = f"{user_prompt}\n\nAdditional instructions: {text_prompt}"

    user_content: list[ChatCompletionContentPartParam] = []
    for image_data_url in image_data_urls:
        user_content.append(
            {
                "type": "image_url",
                "image_url": {"url": image_data_url, "detail": "high"},
            }
        )
    user_content.append(
        {
            "type": "text",
            "text": user_prompt,
        }
    )
    return [
        {
            "role": "system",
            "content": system_prompt.SYSTEM_PROMPT,
        },
        {
            "role": "user",
            "content": user_content,
        },
    ]
