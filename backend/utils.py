import copy
import json
import textwrap
from typing import List
from openai.types.chat import ChatCompletionMessageParam


def pprint_prompt(prompt_messages: List[ChatCompletionMessageParam]):
    print(json.dumps(truncate_data_strings(prompt_messages), indent=4))


def format_prompt_summary(prompt_messages: List[ChatCompletionMessageParam], truncate: bool = True) -> str:
    parts: list[str] = []
    for message in prompt_messages:
        role = message["role"]
        content = message.get("content")
        text = ""
        image_count = 0

        if isinstance(content, list):
            for item in content:
                if item["type"] == "text":
                    text += item["text"] + " "
                elif item["type"] == "image_url":
                    image_count += 1
        else:
            text = str(content)

        text = text.strip()
        if truncate and len(text) > 40:
            text = text[:40] + "..."

        img_part = f" + [{image_count} images]" if image_count else ""
        parts.append(f"  {role.upper()}: {text}{img_part}")

    return "\n".join(parts)


def print_prompt_summary(prompt_messages: List[ChatCompletionMessageParam], truncate: bool = True):
    summary = format_prompt_summary(prompt_messages, truncate)
    lines = summary.split('\n')
    
    # Find the maximum line length, with a minimum of 20
    # If truncating, max is 80, otherwise allow up to 120 for full content
    max_allowed = 80 if truncate else 120
    max_length = max(len(line) for line in lines) if lines else 20
    max_length = max(20, min(max_allowed, max_length))
    
    # Ensure title fits
    title = "PROMPT SUMMARY"
    max_length = max(max_length, len(title) + 4)
    
    print("┌─" + "─" * max_length + "─┐")
    title_padding = (max_length - len(title)) // 2
    print(f"│ {' ' * title_padding}{title}{' ' * (max_length - len(title) - title_padding)} │")
    print("├─" + "─" * max_length + "─┤")
    
    for line in lines:
        if len(line) <= max_length:
            print(f"│ {line:<{max_length}} │")
        else:
            # Wrap long lines
            words = line.split()
            current_line = ""
            for word in words:
                if len(current_line + " " + word) <= max_length:
                    current_line += (" " + word) if current_line else word
                else:
                    if current_line:
                        print(f"│ {current_line:<{max_length}} │")
                    current_line = word
            if current_line:
                print(f"│ {current_line:<{max_length}} │")
    
    print("└─" + "─" * max_length + "─┘")
    print()


def _collapse_preview_text(text: str, max_chars: int = 280) -> str:
    trimmed = text.strip()
    if not trimmed:
        return "(no text)"

    looks_like_code = any(
        marker in trimmed for marker in ("```", "<html", "<!DOCTYPE", "function ", "class ")
    )
    normalized = trimmed if looks_like_code else " ".join(trimmed.split())

    if len(normalized) <= max_chars:
        return normalized

    head_len = max_chars // 2
    tail_len = max_chars // 4
    head = normalized[:head_len].rstrip()
    tail = normalized[-tail_len:].lstrip()
    omitted = max(0, len(normalized) - len(head) - len(tail))
    return f"{head} ... [collapsed {omitted} chars] ... {tail}"


def format_prompt_preview(
    prompt_messages: List[ChatCompletionMessageParam],
    max_chars_per_message: int = 280,
) -> str:
    parts: list[str] = []
    for idx, message in enumerate(prompt_messages):
        role = str(message.get("role", "unknown")).upper()
        content = message.get("content")
        text_chunks: list[str] = []
        media_count = 0

        if isinstance(content, list):
            for item in content:
                if not isinstance(item, dict):
                    continue
                item_type = item.get("type")
                if item_type == "image_url":
                    media_count += 1
                elif item_type == "text":
                    item_text = item.get("text")
                    if isinstance(item_text, str):
                        text_chunks.append(item_text)
        else:
            text_chunks.append("" if content is None else str(content))

        preview_text = _collapse_preview_text(
            "\n".join(text_chunks), max_chars=max_chars_per_message
        )
        media_suffix = f" [{media_count} media]" if media_count else ""
        parts.append(f"{idx + 1}. {role}{media_suffix}")
        wrapped_preview = textwrap.wrap(
            preview_text, width=100, break_long_words=False, break_on_hyphens=False
        )
        if wrapped_preview:
            for line in wrapped_preview:
                parts.append(f"   {line}")
        else:
            parts.append("   (no text)")

    return "\n".join(parts)


def print_prompt_preview(prompt_messages: List[ChatCompletionMessageParam]) -> None:
    preview = format_prompt_preview(prompt_messages)
    lines = preview.split("\n")
    max_length = max(len(line) for line in lines) if lines else 20
    max_length = max(20, min(120, max_length))

    title = "PROMPT PREVIEW"
    max_length = max(max_length, len(title) + 4)

    print("┌─" + "─" * max_length + "─┐")
    title_padding = (max_length - len(title)) // 2
    print(
        f"│ {' ' * title_padding}{title}{' ' * (max_length - len(title) - title_padding)} │"
    )
    print("├─" + "─" * max_length + "─┤")

    for line in lines:
        if len(line) <= max_length:
            print(f"│ {line:<{max_length}} │")
        else:
            wrapped = textwrap.wrap(
                line, width=max_length, break_long_words=False, break_on_hyphens=False
            )
            for wrapped_line in wrapped:
                print(f"│ {wrapped_line:<{max_length}} │")

    print("└─" + "─" * max_length + "─┘")
    print()


def truncate_data_strings(data: List[ChatCompletionMessageParam]):  # type: ignore
    # Deep clone the data to avoid modifying the original object
    cloned_data = copy.deepcopy(data)

    if isinstance(cloned_data, dict):
        for key, value in cloned_data.items():  # type: ignore
            # Recursively call the function if the value is a dictionary or a list
            if isinstance(value, (dict, list)):
                cloned_data[key] = truncate_data_strings(value)  # type: ignore
            # Truncate the string if it it's long and add ellipsis and length
            elif isinstance(value, str):
                cloned_data[key] = value[:40]  # type: ignore
                if len(value) > 40:
                    cloned_data[key] += "..." + f" ({len(value)} chars)"  # type: ignore

    elif isinstance(cloned_data, list):  # type: ignore
        # Process each item in the list
        cloned_data = [truncate_data_strings(item) for item in cloned_data]  # type: ignore

    return cloned_data  # type: ignore
