from typing import Any, cast

from openai.types.chat import ChatCompletionContentPartParam, ChatCompletionMessageParam

from custom_types import InputMode
from prompts.prompt_types import PromptContent, Stack
from prompts.system_prompt import SYSTEM_PROMPT
from prompts.video_prompts import GEMINI_VIDEO_PROMPT


USER_PROMPT = """
Generate code for a web page that looks exactly like the provided screenshot(s).
If multiple screenshots are provided, organize them meaningfully. If they appear to be
different pages in a website, make them distinct pages and link them. If they look like
different tabs or views in an app, connect them with appropriate navigation. If they
appear unrelated, create a scaffold that separates them into "Screenshot 1", "Screenshot 2",
"Screenshot 3", etc. so it is easy to navigate.
For mobile screenshots, do not include the device frame or browser chrome; focus only on
the actual UI mockups.
"""

IMPORTED_CODE_INSTRUCTIONS = """
You are continuing from an imported codebase. Follow these instructions while updating it:

- Do not add comments in the code such as "<!-- Add other navigation links as needed -->" or "<!-- ... other news items ... -->" in place of writing the full code. WRITE THE FULL CODE.
- Repeat elements as needed. For example, if there are 15 items, the code should have 15 items. DO NOT LEAVE comments like "<!-- Repeat for each news item -->" or bad things will happen.
- For images, use placeholder images from https://placehold.co and include a detailed description of the image in the alt text so that an image generation AI can generate the image later.
"""


async def build_prompt_messages(
    stack: Stack,
    input_mode: InputMode,
    generation_type: str,
    prompt: PromptContent,
    history: list[dict[str, Any]],
    is_imported_from_code: bool,
) -> list[ChatCompletionMessageParam]:
    prompt_messages: list[ChatCompletionMessageParam] = []

    if is_imported_from_code:
        original_imported_code = history[0]["text"] if history else ""
        imported_user_prompt = resolve_imported_code_user_prompt(prompt, history)
        prompt_messages = build_imported_code_prompt_messages(
            original_imported_code,
            stack,
            imported_user_prompt,
        )
    else:
        if input_mode == "image":
            image_urls = prompt.get("images", [])
            text_prompt = prompt.get("text", "")
            prompt_messages = build_image_prompt_messages(image_urls, stack, text_prompt)
        elif input_mode == "text":
            prompt_messages = build_text_prompt_messages(prompt["text"], stack)
        elif input_mode == "video":
            if generation_type == "create":
                video_urls = prompt.get("images", [])
                if not video_urls:
                    raise ValueError("Video mode requires a video to be provided")
                video_url = video_urls[0]
                prompt_messages = build_video_prompt_messages(
                    video_data_url=video_url,
                    text_prompt=prompt.get("text", ""),
                )
            else:
                prompt_messages = [
                    cast(
                        ChatCompletionMessageParam,
                        {"role": "system", "content": SYSTEM_PROMPT},
                    )
                ]
        else:
            image_urls = prompt.get("images", [])
            text_prompt = prompt.get("text", "")
            prompt_messages = build_image_prompt_messages(image_urls, stack, text_prompt)

        if generation_type == "update":
            for index, item in enumerate(history):
                role = "assistant" if index % 2 == 0 else "user"
                message = build_history_message(item, role)
                prompt_messages.append(message)

    return prompt_messages


def build_history_message(
    item: dict[str, Any], role: str
) -> ChatCompletionMessageParam:
    if role == "user" and item.get("images") and len(item["images"]) > 0:
        user_content: list[ChatCompletionContentPartParam] = []

        for image_url in item["images"]:
            user_content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": image_url, "detail": "high"},
                }
            )

        user_content.append(
            {
                "type": "text",
                "text": item["text"],
            }
        )

        return cast(
            ChatCompletionMessageParam,
            {
                "role": role,
                "content": user_content,
            },
        )

    return cast(
        ChatCompletionMessageParam,
        {
            "role": role,
            "content": item["text"],
        },
    )


def build_imported_code_prompt_messages(
    code: str,
    stack: Stack,
    user_prompt: PromptContent,
) -> list[ChatCompletionMessageParam]:
    system_content = (
        SYSTEM_PROMPT.strip()
        + "\n\n"
        + IMPORTED_CODE_INSTRUCTIONS.strip()
        + f"\n\nSelected stack: {stack}."
        + "\n\nThe current app code is provided below. Update it per the request."
        + f"\n\n{code}"
    )

    return [
        {
            "role": "system",
            "content": system_content,
        },
        build_history_message(
            {
                "text": user_prompt.get("text", ""),
                "images": user_prompt.get("images", []),
            },
            "user",
        ),
    ]


def resolve_imported_code_user_prompt(
    prompt: PromptContent,
    history: list[dict[str, Any]],
) -> PromptContent:
    prompt_text = prompt.get("text", "")
    prompt_images = prompt.get("images", [])
    normalized_prompt_images: list[str] = []
    if isinstance(prompt_images, list):
        raw_prompt_images = cast(list[object], prompt_images)
        for image in raw_prompt_images:
            if isinstance(image, str):
                normalized_prompt_images.append(image)

    if prompt_text.strip():
        return {
            "text": prompt_text,
            "images": normalized_prompt_images,
        }

    for index in range(len(history) - 1, 0, -1):
        if index % 2 == 1:
            item = history[index]
            text = item.get("text", "")
            images = item.get("images", [])
            normalized_images: list[str] = []
            if isinstance(images, list):
                raw_images = cast(list[object], images)
                for image in raw_images:
                    if isinstance(image, str):
                        normalized_images.append(image)
            return {
                "text": text if isinstance(text, str) else "",
                "images": normalized_images,
            }

    if normalized_prompt_images:
        return {
            "text": "",
            "images": normalized_prompt_images,
        }

    return {
        "text": "Update the imported code according to the latest request.",
        "images": [],
    }


def build_image_prompt_messages(
    image_data_urls: list[str],
    stack: Stack,
    text_prompt: str = "",
) -> list[ChatCompletionMessageParam]:
    system_content = SYSTEM_PROMPT
    user_prompt = USER_PROMPT.strip() + f"\n\nSelected stack: {stack}"

    if text_prompt.strip():
        user_prompt = user_prompt + "\n\nAdditional instructions: " + text_prompt

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
            "content": system_content,
        },
        {
            "role": "user",
            "content": user_content,
        },
    ]


def build_text_prompt_messages(
    text_prompt: str,
    stack: Stack,
) -> list[ChatCompletionMessageParam]:
    return [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        },
        {
            "role": "user",
            "content": f"""
            - Make sure to make it look modern and sleek.
            - Use modern, professional fonts and colors.
            - Follow UX best practices.
            Selected stack: {stack}.
            Generate UI for {text_prompt}.
            """,
        },
    ]


def build_video_prompt_messages(
    video_data_url: str,
    text_prompt: str = "",
) -> list[ChatCompletionMessageParam]:
    user_text = """
    You have been given a video of a user interacting with a web app. You need to re-create the same app exactly such that the same user interactions will produce the same results in the app you build.

    - Watch the entire video carefully and understand all the user interactions and UI state changes.
    - Make sure the app looks exactly like what you see in the video.
    - Pay close attention to background color, text color, font size, font family,
    padding, margin, border, etc. Match the colors and sizes exactly.
    - For images, use placeholder images from https://placehold.co and include a detailed description of the image in the alt text so that an image generation AI can generate the image later.
    - Put image URLs in HTML (hide / unhide as needed). Do not put image URLs within JavaScript because our parser cannot extract them from JavaScript.
    - If some functionality requires a backend call, just mock the data instead.
    - MAKE THE APP FUNCTIONAL using JavaScript. Allow the user to interact with the app and get the same behavior as shown in the video.
    - Use SVGs and interactive 3D elements if needed to match the functionality shown in the video.

    Analyze this video and generate the code.
    
    Selected stack: HTML, jQuery and Tailwind CSS.
    """
    if text_prompt.strip():
        user_text = user_text + "\n\nAdditional instructions: " + text_prompt

    user_content: list[ChatCompletionContentPartParam] = [
        {
            "type": "image_url",
            "image_url": {"url": video_data_url, "detail": "high"},
        },
        {
            "type": "text",
            "text": user_text,
        },
    ]

    return [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        },
        {
            "role": "user",
            "content": user_content,
        },
    ]
