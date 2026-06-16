import asyncio
from typing import Dict, Optional, Tuple

from playwright.async_api import (
    Browser,
    Playwright,
    TimeoutError as PlaywrightTimeoutError,
    async_playwright,
)

VIEWPORT_SIZES: Dict[str, Tuple[int, int]] = {
    "desktop": (1280, 832),
    "mobile": (342, 684),
}

PAGE_LOAD_TIMEOUT_MS = 15000
RENDER_SETTLE_MS = 250

_playwright: Optional[Playwright] = None
_browser: Optional[Browser] = None
_browser_lock = asyncio.Lock()

# Whether headless Chromium can actually launch on this host. None until the
# first probe runs. Used to gate the screenshot_preview tool so it isn't
# offered to the model when Playwright/Chromium isn't properly installed.
_available: Optional[bool] = None


async def probe_screenshot_preview() -> bool:
    """Check (once, cached) whether headless Chromium can launch here.

    Launches the shared browser so the result doubles as a warm-up. Catches
    every failure mode — missing browser binary, missing Linux system
    libraries, sandbox errors — and logs why it's disabled.
    """
    global _available
    if _available is not None:
        return _available
    try:
        await _get_browser()
        _available = True
        print("[screenshot_preview] Chromium available — tool enabled.")
    except Exception as exc:
        _available = False
        print(
            "[screenshot_preview] Chromium unavailable — tool disabled. "
            f"Install it with `playwright install chromium`. Cause: {exc}"
        )
    return _available


def is_screenshot_preview_available() -> bool:
    """Synchronous accessor for the cached probe result.

    Defaults to True when the probe hasn't run yet so we never wrongly hide the
    tool before startup has checked; the runtime still fails safe if a call
    errors. In practice the startup probe sets this before any request.
    """
    return _available if _available is not None else True


async def _get_browser() -> Browser:
    global _playwright, _browser
    async with _browser_lock:
        if _browser is None or not _browser.is_connected():
            if _playwright is None:
                _playwright = await async_playwright().start()
            # --no-sandbox: Chromium refuses to launch as root (the user in
            # most containers/hosted Linux) unless the sandbox is disabled.
            _browser = await _playwright.chromium.launch(
                headless=True,
                args=["--no-sandbox"],
            )
        return _browser


async def capture_preview_screenshot(
    html: str,
    device: str = "desktop",
    full_page: bool = True,
) -> bytes:
    """Render HTML in headless Chromium and return PNG bytes.

    Runs locally, so the page can load assets served from localhost
    (e.g. /local-assets/ URLs) that an external screenshot API cannot reach.
    """
    browser = await _get_browser()
    width, height = VIEWPORT_SIZES.get(device, VIEWPORT_SIZES["desktop"])
    page = await browser.new_page(
        viewport={"width": width, "height": height},
        device_scale_factor=1,
    )
    try:
        try:
            await page.set_content(
                html,
                wait_until="networkidle",
                timeout=PAGE_LOAD_TIMEOUT_MS,
            )
        except PlaywrightTimeoutError:
            # Content is already set; capture whatever rendered if the
            # network never settles (e.g. pages that poll).
            pass
        try:
            await page.evaluate("document.fonts.ready")
        except Exception:
            pass
        await page.wait_for_timeout(RENDER_SETTLE_MS)
        return await page.screenshot(full_page=full_page, type="png")
    finally:
        await page.close()
