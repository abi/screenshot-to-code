import copy
from typing import Any, Dict, List, Tuple, cast

from openai.types.chat import ChatCompletionMessageParam

from image_processing.utils import process_image


def convert_openai_messages_to_claude(
    messages: List[ChatCompletionMessageParam],
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Convert OpenAI-format messages to Claude-format messages.
    """
    cloned_messages = copy.deepcopy(messages)

    system_prompt = cast(str, cloned_messages[0].get("content"))
    claude_messages = [dict(message) for message in cloned_messages[1:]]

    for message in claude_messages:
        if not isinstance(message["content"], list):
            continue

        for content in message["content"]:  # type: ignore
            if content["type"] != "image_url":
                continue

            content["type"] = "image"
            image_data_url = cast(str, content["image_url"]["url"])
            media_type, base64_data = process_image(image_data_url)
            del content["image_url"]
            content["source"] = {
                "type": "base64",
                "media_type": media_type,
                "data": base64_data,
            }

    return system_prompt, claude_messages
