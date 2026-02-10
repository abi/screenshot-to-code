from openai.types.chat import ChatCompletionContentPartParam, ChatCompletionMessageParam
from prompts.prompt_types import Stack
from prompts import system_prompt


def build_video_prompt_messages(
    video_data_url: str,
    stack: Stack,
    text_prompt: str,
) -> list[ChatCompletionMessageParam]:
    user_text = f"""
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
    
    Selected stack: {stack}.
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
            "content": system_prompt.SYSTEM_PROMPT,
        },
        {
            "role": "user",
            "content": user_content,
        },
    ]
