from typing import Literal, TypedDict


class SystemPrompts(TypedDict):
    html_tailwind: str
    react_tailwind: str
    react_css: str
    bootstrap: str
    ionic_tailwind: str
    vue_tailwind: str
    svg: str


Stack = Literal[
    "html_tailwind",
    "react_tailwind",
    "react_css",
    "bootstrap",
    "ionic_tailwind",
    "vue_tailwind",
    "svg",
]
