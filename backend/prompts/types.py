from typing import Literal, TypedDict, List


class SystemPrompts(TypedDict):
    html_css: str
    html_tailwind: str
    react_tailwind: str
    bootstrap: str
    ionic_tailwind: str
    vue_tailwind: str
    svg: str


class PromptContent(TypedDict):
    """Unified structure for prompt text and images."""

    text: str
    images: List[str]


Stack = Literal[
    "html_css",
    "html_tailwind",
    "react_tailwind",
    "bootstrap",
    "ionic_tailwind",
    "vue_tailwind",
    "svg",
]
