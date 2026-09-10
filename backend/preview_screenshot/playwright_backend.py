import asyncio
import ipaddress
import socket
from typing import Optional
from urllib.parse import urlparse

from playwright.async_api import (
    Browser,
    Playwright,
    Route,
    TimeoutError as PlaywrightTimeoutError,
    async_playwright,
)

from preview_screenshot.base import VIEWPORT_SIZES

PAGE_LOAD_TIMEOUT_MS = 15000
RENDER_SETTLE_MS = 250

# Only these hostnames are trusted to reach loopback: the /local-assets/
# route this same backend serves. Everything else that resolves to a
# loopback, private, or link-local address (including cloud metadata
# endpoints like 169.254.169.254) is blocked so that LLM-generated HTML
# can't turn this browser into an SSRF proxy into the local network.
ALLOWED_LOOPBACK_HOSTS = {"localhost", "127.0.0.1", "::1"}

# Schemes that never touch the network and are always safe to allow.
_NETWORKLESS_SCHEMES = {"data", "blob", "about", "javascript"}


def _is_blocked_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    return (
        ip.is_loopback
        or ip.is_private
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
    )


def _resolve_is_blocked(hostname: str) -> bool:
    """Resolve `hostname` and report whether any address is internal/local.

    Unresolvable hostnames are blocked too, rather than let them through.
    """
    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return True

    for info in infos:
        raw_ip = info[4][0]
        try:
            ip = ipaddress.ip_address(raw_ip)
        except ValueError:
            continue
        if _is_blocked_ip(ip):
            return True
    return False


async def _guard_request(route: Route) -> None:
    request = route.request
    parsed = urlparse(request.url)

    if parsed.scheme in _NETWORKLESS_SCHEMES:
        await route.continue_()
        return

    if parsed.scheme not in ("http", "https"):
        await route.abort()
        return

    hostname = (parsed.hostname or "").lower()
    if hostname in ALLOWED_LOOPBACK_HOSTS:
        await route.continue_()
        return

    loop = asyncio.get_event_loop()
    blocked = await loop.run_in_executor(None, _resolve_is_blocked, hostname)
    if blocked:
        await route.abort()
        return

    await route.continue_()


class PlaywrightBackend:
    """Default backend: renders in local headless Chromium.

    Runs locally, so the page can load assets served from localhost
    (e.g. /local-assets/ URLs) that an external screenshot API cannot reach.
    Holds one shared browser, launched lazily and reused across captures.
    """

    def __init__(self) -> None:
        self._playwright: Optional[Playwright] = None
        self._browser: Optional[Browser] = None
        self._lock = asyncio.Lock()

    async def _get_browser(self) -> Browser:
        async with self._lock:
            if self._browser is None or not self._browser.is_connected():
                if self._playwright is None:
                    self._playwright = await async_playwright().start()
                # --no-sandbox: Chromium refuses to launch as root (the user in
                # most containers/hosted Linux) unless the sandbox is disabled.
                self._browser = await self._playwright.chromium.launch(
                    headless=True,
                    args=["--no-sandbox"],
                )
            return self._browser

    async def available(self) -> bool:
        """Launch (and warm up) Chromium; report whether it works.

        Catches every failure mode — missing browser binary, missing Linux
        system libraries, sandbox errors — and logs why it's disabled.
        """
        try:
            await self._get_browser()
            print("[screenshot_preview] Chromium available — tool enabled.")
            return True
        except Exception as exc:
            print(
                "[screenshot_preview] Chromium unavailable — tool disabled. "
                f"Install it with `playwright install chromium`. Cause: {exc}"
            )
            return False

    async def capture(
        self,
        html: str,
        device: str = "desktop",
        full_page: bool = True,
    ) -> bytes:
        browser = await self._get_browser()
        width, height = VIEWPORT_SIZES.get(device, VIEWPORT_SIZES["desktop"])
        page = await browser.new_page(
            viewport={"width": width, "height": height},
            device_scale_factor=1,
        )
        await page.route("**/*", _guard_request)
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
