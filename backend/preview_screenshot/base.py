from dataclasses import dataclass, field
from typing import Dict, List, Optional, Protocol, Tuple, TypedDict

# Device viewports the screenshot_preview tool renders at. Shared by every
# backend so previews are consistently sized regardless of how they're rendered.
VIEWPORT_SIZES: Dict[str, Tuple[int, int]] = {
    "desktop": (1280, 832),
    "mobile": (342, 684),
}

# User actions screenshot_preview can replay before capturing.
ACTION_TYPES: Tuple[str, ...] = (
    "click",
    "type",
    "press",
    "select",
    "hover",
    "scroll",
    "wait",
    "screenshot",
)


class PreviewAction(TypedDict, total=False):
    """One user action. ``target`` is a CSS selector or the element's visible
    text; ``value`` is the text to type, option to select, key to press,
    pixels to scroll, milliseconds to wait, or a label for a screenshot."""

    type: str
    target: Optional[str]
    value: Optional[str]


@dataclass
class PreviewShot:
    label: str
    png: bytes
    full_page: bool


@dataclass
class PreviewRender:
    """What a render produced: screenshots plus what happened on the page."""

    shots: List[PreviewShot] = field(default_factory=lambda: [])
    action_log: List[str] = field(default_factory=lambda: [])
    errors: List[str] = field(default_factory=lambda: [])
    url: str = ""
    title: str = ""


class ScreenshotBackend(Protocol):
    """A pluggable renderer for screenshot_preview.

    The default is local Chromium (``PlaywrightBackend``); a deployment can
    register an alternative — e.g. an external rendering API — via
    ``set_screenshot_backend`` without the feature code knowing anything about
    it. The screenshot_preview tool talks only to this interface.
    """

    async def capture(self, html: str, device: str, full_page: bool) -> bytes:
        """Render ``html`` to PNG bytes at the given device viewport."""
        ...

    async def available(self) -> bool:
        """Whether this backend can run here (warming it up if needed)."""
        ...


class InteractiveScreenshotBackend(ScreenshotBackend, Protocol):
    """A backend that can also replay user actions before capturing."""

    async def render(
        self,
        html: str,
        device: str,
        full_page: bool,
        actions: List[PreviewAction],
    ) -> PreviewRender:
        """Load ``html``, run ``actions`` in order, then capture the result."""
        ...
