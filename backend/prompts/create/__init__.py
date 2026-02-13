from custom_types import InputMode
from prompts.create.image import build_image_prompt_messages
from prompts.create.text import build_text_prompt_messages
from prompts.create.video import build_video_prompt_messages
from prompts.prompt_types import Stack, UserTurnInput
from prompts.render import Prompt


def build_create_prompt_from_input(
    input_mode: InputMode,
    stack: Stack,
    prompt: UserTurnInput,
) -> Prompt:
    if input_mode == "image":
        image_urls = prompt.get("images", [])
        text_prompt = prompt.get("text", "")
        return build_image_prompt_messages(
            image_data_urls=image_urls,
            stack=stack,
            text_prompt=text_prompt,
        )
    if input_mode == "text":
        return build_text_prompt_messages(
            text_prompt=prompt["text"],
            stack=stack,
        )
    if input_mode == "video":
        video_urls = prompt.get("videos", [])
        if not video_urls:
            raise ValueError("Video mode requires a video to be provided")
        video_url = video_urls[0]
        return build_video_prompt_messages(
            video_data_url=video_url,
            stack=stack,
            text_prompt=prompt.get("text", ""),
        )
    raise ValueError(f"Unsupported input mode: {input_mode}")


__all__ = ["build_create_prompt_from_input"]
