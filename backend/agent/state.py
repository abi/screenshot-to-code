from dataclasses import dataclass
from typing import Any, List

from openai.types.chat import ChatCompletionMessageParam

from codegen.utils import extract_html_content


@dataclass
class AgentFileState:
    path: str = "index.html"
    content: str = ""


def ensure_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value)


def extract_text_content(message: ChatCompletionMessageParam) -> str:
    content = message.get("content", "")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        for part in content:
            if isinstance(part, dict) and part.get("type") == "text":
                return ensure_str(part.get("text"))
    return ""


def seed_file_state_from_messages(
    file_state: AgentFileState,
    prompt_messages: List[ChatCompletionMessageParam],
) -> None:
    if file_state.content:
        return

    for message in reversed(prompt_messages):
        if message.get("role") != "assistant":
            continue
        raw_text = extract_text_content(message)
        if not raw_text:
            continue
        extracted = extract_html_content(raw_text)
        file_state.content = extracted or raw_text
        if not file_state.path:
            file_state.path = "index.html"
        return

    if not prompt_messages:
        return

    system_message = prompt_messages[0]
    if system_message.get("role") != "system":
        return

    system_text = extract_text_content(system_message)
    markers = [
        "Here is the code of the app:",
    ]
    for marker in markers:
        if marker not in system_text:
            continue
        raw_text = system_text.split(marker, 1)[1].strip()
        extracted = extract_html_content(raw_text)
        file_state.content = extracted or raw_text
        if not file_state.path:
            file_state.path = "index.html"
        return
