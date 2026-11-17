"""screenshot_preview rendering: a pluggable backend behind a stable API.

Split for maintainability:
- ``base``               — the ``ScreenshotBackend`` interface + shared viewports
- ``playwright_backend`` — the default local-Chromium implementation
- ``registry``           — the active backend + the functions the app calls

Callers import everything they need straight from ``preview_screenshot``; the
internal module layout is an implementation detail.
"""

from preview_screenshot.base import (
    ACTION_TYPES,
    InteractiveScreenshotBackend,
    PreviewAction,
    PreviewRender,
    PreviewShot,
    ScreenshotBackend,
    VIEWPORT_SIZES,
)
from preview_screenshot.playwright_backend import PlaywrightBackend
from preview_screenshot.registry import (
    capture_preview_screenshot,
    is_screenshot_preview_available,
    probe_screenshot_preview,
    render_preview,
    set_screenshot_backend,
    supports_preview_actions,
)

__all__ = [
    "ACTION_TYPES",
    "InteractiveScreenshotBackend",
    "PreviewAction",
    "PreviewRender",
    "PreviewShot",
    "ScreenshotBackend",
    "VIEWPORT_SIZES",
    "PlaywrightBackend",
    "capture_preview_screenshot",
    "is_screenshot_preview_available",
    "probe_screenshot_preview",
    "render_preview",
    "set_screenshot_backend",
    "supports_preview_actions",
]
