from typing import List, Literal, TypedDict


class _UserTurnInputRequired(TypedDict):
    text: str
    images: List[str]
    videos: List[str]


class UserTurnInput(_UserTurnInputRequired, total=False):
    """Normalized current user turn payload from the request."""

    # Full instruction for the model when it differs from the display text
    # (e.g. includes the selected-element reference, built by the frontend).
    full_text: str


class PromptHistoryMessage(TypedDict):
    """Explicit role-based message structure for edit history."""

    role: Literal["user", "assistant"]
    text: str
    images: List[str]
    videos: List[str]


PromptConstructionStrategy = Literal[
    "create_from_input",
    "update_from_history",
    "update_from_file_snapshot",
]


Stack = Literal[
    "html_css",
    "html_tailwind",
    "react_tailwind",
    "bootstrap",
    "ionic_tailwind",
    "vue_tailwind",
]


class PromptConstructionPlan(TypedDict):
    """Derived plan used by prompt builders to choose a single construction path."""

    generation_type: Literal["create", "update"]
    input_mode: Literal["image", "video", "text"]
    stack: Stack
    construction_strategy: PromptConstructionStrategy
