"""Hosted-only screenshot backend: renders via ScreenshotOne, not Chromium.

screenshot_preview needs a renderer; on hosted the host has no local Chromium
(e.g. native Render), so we offload to ScreenshotOne's HTML-rendering API. The
page's assets must be publicly reachable — in prod they're S3 URLs, which the
external renderer can fetch. Registered in main.py under IS_PROD via
``set_screenshot_backend``.

A peer of ``playwright_backend`` but hosted-only: the package ``__init__`` does
not import it, so the shared modules stay byte-identical to the open-source
``main`` branch and this file is a pure, conflict-free addition.
"""

import httpx

from config import PLATFORM_SCREENSHOTONE_API_KEY
from preview_screenshot.base import VIEWPORT_SIZES

SCREENSHOTONE_TAKE_URL = "https://api.screenshotone.com/take"
SCREENSHOTONE_TIMEOUT_S = 60.0


class ScreenshotOneBackend:
    """Render raw HTML to PNG via ScreenshotOne's POST /take endpoint.

    Satisfies the ``ScreenshotBackend`` protocol structurally — no inheritance.
    """

    async def capture(
        self,
        html: str,
        device: str = "desktop",
        full_page: bool = True,
    ) -> bytes:
        width, height = VIEWPORT_SIZES.get(device, VIEWPORT_SIZES["desktop"])
        payload: dict[str, object] = {
            "html": html,
            "access_key": PLATFORM_SCREENSHOTONE_API_KEY,
            "full_page": full_page,
            "viewport_width": width,
            "viewport_height": height,
            "device_scale_factor": 1,
            "format": "png",
            # Force a fresh render; a stale cached frame would defeat the
            # verification loop.
            "cache": False,
        }
        async with httpx.AsyncClient(timeout=SCREENSHOTONE_TIMEOUT_S) as client:
            response = await client.post(SCREENSHOTONE_TAKE_URL, json=payload)
        if response.status_code != 200 or not response.content:
            raise RuntimeError(
                f"ScreenshotOne request failed ({response.status_code}): "
                f"{response.text[:300]}"
            )
        return response.content

    async def available(self) -> bool:
        if PLATFORM_SCREENSHOTONE_API_KEY:
            print("[screenshot_preview] ScreenshotOne configured — tool enabled (prod).")
            return True
        print(
            "[screenshot_preview] PLATFORM_SCREENSHOTONE_API_KEY missing — "
            "tool disabled (prod)."
        )
        return False
