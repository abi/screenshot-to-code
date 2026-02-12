from typing import List, cast

from prompts.prompt_types import PromptContent, PromptHistoryMessage


def _to_string_list(value: object) -> List[str]:
    if not isinstance(value, list):
        return []
    raw_list = cast(List[object], value)
    return [item for item in raw_list if isinstance(item, str)]


def parse_prompt_content(raw_prompt: object) -> PromptContent:
    if not isinstance(raw_prompt, dict):
        return {"text": "", "images": [], "videos": []}

    prompt_dict = cast(dict[str, object], raw_prompt)
    text = prompt_dict.get("text")
    return {
        "text": text if isinstance(text, str) else "",
        "images": _to_string_list(prompt_dict.get("images")),
        "videos": _to_string_list(prompt_dict.get("videos")),
    }


def parse_prompt_history(raw_history: object) -> List[PromptHistoryMessage]:
    if not isinstance(raw_history, list):
        return []

    history: List[PromptHistoryMessage] = []
    raw_items = cast(List[object], raw_history)
    for item in raw_items:
        if not isinstance(item, dict):
            continue

        item_dict = cast(dict[str, object], item)
        role_value = item_dict.get("role")
        if not isinstance(role_value, str) or role_value not in ("user", "assistant"):
            continue

        text = item_dict.get("text")
        history.append(
            {
                "role": role_value,
                "text": text if isinstance(text, str) else "",
                "images": _to_string_list(item_dict.get("images")),
                "videos": _to_string_list(item_dict.get("videos")),
            }
        )

    return history
