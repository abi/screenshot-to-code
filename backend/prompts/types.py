from typing import Literal, TypedDict


class SystemPrompts(TypedDict):
    html_css: str
    html_tailwind: str
    html_tailwind_thinking: str
    react_tailwind: str
    bootstrap: str
    ionic_tailwind: str
    ionic_react: str
    vue_tailwind: str
    svg: str


Stack = Literal[
    "html_css",
    "html_tailwind",
    "html_tailwind_thinking",
    "react_tailwind",
    "bootstrap",
    "ionic_tailwind",
    "ionic_react",
    "vue_tailwind",
    "svg",
]
