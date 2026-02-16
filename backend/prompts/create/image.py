from openai.types.chat import ChatCompletionContentPartParam, ChatCompletionMessageParam

from prompts.prompt_types import Stack
from prompts import system_prompt
from prompts.policies import build_selected_stack_policy, build_user_image_policy

def build_image_prompt_messages(
    image_data_urls: list[str],
    stack: Stack,
    text_prompt: str,
    image_generation_enabled: bool,
) -> list[ChatCompletionMessageParam]:
    image_policy = build_user_image_policy(image_generation_enabled)
    selected_stack = build_selected_stack_policy(stack)
    user_prompt = f"""
Generate code for a web page that looks exactly like the provided screenshot(s).

{selected_stack}

## Replication instructions

- Make sure the app looks exactly like the screenshot.
- Pay close attention to background color, text color, font size, font family, 
padding, margin, border, etc. Match the colors and sizes exactly.
- Use the exact text from the screenshot.
- Repeat elements as needed to match the screenshot. For example, if there are 15 items, the code should have 15 items. DO NOT LEAVE comments like "<!-- Repeat for each news item -->" or bad things will happen.
- {image_policy}

## Multiple screenshots

If multiple screenshots are provided, organize them meaningfully. If they appear to be different pages in a website, make them distinct pages and link them. If they look like different tabs or views in an app, connect them with appropriate navigation. If they appear unrelated, create a scaffold that separates them into "Screenshot 1", "Screenshot 2", "Screenshot 3", etc. so it is easy to navigate. For mobile screenshots, do not include the device frame or browser chrome; focus only on the actual UI mockups."""

    # Add additional instructions provided by the user
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
