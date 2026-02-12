from typing import List, Literal, TypedDict


class PromptContent(TypedDict):
    """Unified structure for prompt text and images."""

    text: str
    images: List[str]
    videos: List[str]


class PromptHistoryMessage(TypedDict):
    """Explicit role-based message structure for edit history."""

    role: Literal["user", "assistant"]
    text: str
    images: List[str]
    videos: List[str]


Stack = Literal[
    "html_css",
    "html_tailwind",
    "react_tailwind",
    "bootstrap",
    "ionic_tailwind",
    "vue_tailwind",
]
