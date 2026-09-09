import os
from typing import Optional

from babel_cdn import normalize_babel_cdn
from preview_screenshot.base import ScreenshotBackend
from preview_screenshot.playwright_backend import PlaywrightBackend

_backend: ScreenshotBackend = PlaywrightBackend()
_available: Optional[bool] = None


def set_screenshot_backend(backend: ScreenshotBackend) -> None:
    global _backend
    _backend = backend


async def probe_screenshot_preview() -> bool:
    global _available
    if os.environ.get("DISABLE_SCREENSHOT_PREVIEW", "").strip().lower() in {"1", "true", "yes", "on"}:
        _available = False
        return False
    if _available is None:
        _available = await _backend.available()
    return _available


def is_screenshot_preview_available() -> bool:
    if os.environ.get("DISABLE_SCREENSHOT_PREVIEW", "").strip().lower() in {"1", "true", "yes", "on"}:
        return False
    return _available if _available is not None else True


async def capture_preview_screenshot(
    html: str,
    device: str = "desktop",
    full_page: bool = True,
) -> bytes:
    return await _backend.capture(normalize_babel_cdn(html), device, full_page)
