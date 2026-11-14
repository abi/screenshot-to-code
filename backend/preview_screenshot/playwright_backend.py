import asyncio
from typing import List, Optional

from playwright.async_api import (
    Browser,
    ConsoleMessage,
    Locator,
    Page,
    Playwright,
    TimeoutError as PlaywrightTimeoutError,
    async_playwright,
)

from preview_screenshot.base import (
    VIEWPORT_SIZES,
    PreviewAction,
    PreviewRender,
    PreviewShot,
)

PAGE_LOAD_TIMEOUT_MS = 15000
RENDER_SETTLE_MS = 250
ACTION_TIMEOUT_MS = 3000
ACTION_SETTLE_MS = 400
MAX_WAIT_MS = 5000
DEFAULT_SCROLL_PX = 800
MAX_ERRORS = 10
MAX_ERROR_CHARS = 300

# [page scrollY, summed scrollTop of inner scroll containers]
SCROLL_STATE_JS = """() => {
  let inner = 0;
  for (const el of document.querySelectorAll('*')) inner += el.scrollTop;
  return [Math.round(window.scrollY), Math.round(inner - document.documentElement.scrollTop)];
}"""


def _short(text: str, limit: int = 60) -> str:
    text = " ".join(text.split())
    return text if len(text) <= limit else text[: limit - 1] + "…"


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
        rendered = await self.render(html, device, full_page, [])
        return rendered.shots[-1].png

    async def render(
        self,
        html: str,
        device: str,
        full_page: bool,
        actions: List[PreviewAction],
    ) -> PreviewRender:
        browser = await self._get_browser()
        width, height = VIEWPORT_SIZES.get(device, VIEWPORT_SIZES["desktop"])
        page = await browser.new_page(
            viewport={"width": width, "height": height},
            device_scale_factor=1,
        )
        rendered = PreviewRender()

        def record_error(message: str) -> None:
            if len(rendered.errors) < MAX_ERRORS:
                rendered.errors.append(_short(message, MAX_ERROR_CHARS))

        def on_page_error(exc: Exception) -> None:
            record_error(str(exc))

        def on_console(msg: ConsoleMessage) -> None:
            # Broken image URLs and React dev-build warnings are common and
            # harmless; keep real script errors.
            if msg.type == "error" and not msg.text.startswith(
                ("Failed to load resource", "Warning:")
            ):
                record_error(msg.text)

        page.on("pageerror", on_page_error)
        page.on("console", on_console)

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

            for index, action in enumerate(actions, start=1):
                kind = action.get("type") or ""
                try:
                    outcome = await self._run_action(page, action, rendered)
                    rendered.action_log.append(f"{index}. {kind}: {outcome}")
                except Exception as exc:
                    reason = str(exc).split("\n")[0]
                    rendered.action_log.append(f"{index}. {kind}: FAILED — {_short(reason, 200)}")
                    skipped = len(actions) - index
                    if skipped:
                        rendered.action_log.append(
                            f"Stopped; the remaining {skipped} action(s) were not run."
                        )
                    break

            if actions:
                await page.wait_for_timeout(RENDER_SETTLE_MS)
            rendered.shots.append(
                PreviewShot(
                    label="after actions" if actions else "initial",
                    png=await page.screenshot(full_page=full_page, type="png"),
                    full_page=full_page,
                )
            )
            rendered.url = page.url
            rendered.title = await page.title()
            return rendered
        finally:
            await page.close()

    async def _locate(self, page: Page, target: str) -> Locator:
        """First visible element matching ``target`` as a CSS selector,
        placeholder, label, exact visible text or partial visible text."""
        candidates: List[Locator] = []
        try:
            css = page.locator(target)
            await css.count()  # raises if target is not a valid selector
            candidates.append(css)
        except Exception:
            pass
        candidates += [
            page.get_by_placeholder(target, exact=True),
            page.get_by_label(target, exact=True),
            page.get_by_text(target, exact=True),
            page.get_by_text(target),
        ]
        for candidate in candidates:
            visible = candidate.locator("visible=true")
            if await visible.count():
                return visible.first
        raise LookupError(f'no visible element matches "{_short(target)}"')

    async def _describe(self, locator: Locator) -> str:
        tag, text = await locator.evaluate(
            "e => [e.tagName.toLowerCase(), (e.innerText || e.value || '').trim()]"
        )
        return f'<{tag}> "{_short(text, 40)}"' if text else f"<{tag}>"

    async def _run_action(
        self, page: Page, action: PreviewAction, rendered: PreviewRender
    ) -> str:
        kind = action.get("type") or ""
        target = (action.get("target") or "").strip()
        value = action.get("value") or ""

        if kind == "wait":
            ms = min(int(value or 500), MAX_WAIT_MS)
            await page.wait_for_timeout(ms)
            return f"waited {ms} ms"

        if kind == "screenshot":
            label = value or f"step {len(rendered.shots) + 1}"
            rendered.shots.append(
                PreviewShot(
                    label=label,
                    png=await page.screenshot(full_page=False, type="png"),
                    full_page=False,
                )
            )
            return f'captured "{label}" (viewport)'

        if kind == "scroll":
            before = await page.evaluate(SCROLL_STATE_JS)
            if target:
                element = await self._locate(page, target)
                await element.scroll_into_view_if_needed(timeout=ACTION_TIMEOUT_MS)
                outcome = f"scrolled {await self._describe(element)} into view"
            else:
                pixels = int(value or DEFAULT_SCROLL_PX)
                viewport = page.viewport_size or {"width": 1280, "height": 832}
                await page.mouse.move(viewport["width"] / 2, viewport["height"] / 2)
                await page.mouse.wheel(0, pixels)
                outcome = f"scrolled by {pixels}px"
            await page.wait_for_timeout(ACTION_SETTLE_MS)
            after = await page.evaluate(SCROLL_STATE_JS)
            if after[0] != before[0]:
                moved = f"page scrollY {before[0]} → {after[0]}"
            elif after[1] != before[1]:
                moved = "an inner scroll container moved; page scrollY unchanged"
            else:
                moved = "nothing moved (already at the end, or not scrollable here)"
            return f"{outcome} ({moved})"

        if kind == "press" and not target:
            await page.keyboard.press(value)
            await page.wait_for_timeout(ACTION_SETTLE_MS)
            return f'pressed "{value}"'

        if not target:
            raise ValueError(f"{kind} needs a target")
        element = await self._locate(page, target)
        described = await self._describe(element)

        if kind == "click":
            await element.click(timeout=ACTION_TIMEOUT_MS)
            outcome = f"clicked {described}"
        elif kind == "hover":
            await element.hover(timeout=ACTION_TIMEOUT_MS)
            outcome = f"hovered {described}"
        elif kind == "type":
            await element.click(timeout=ACTION_TIMEOUT_MS)
            await element.fill("", timeout=ACTION_TIMEOUT_MS)
            await element.press_sequentially(value, delay=20)
            outcome = f'typed "{_short(value)}" into {described}'
        elif kind == "press":
            await element.press(value, timeout=ACTION_TIMEOUT_MS)
            outcome = f'pressed "{value}" on {described}'
        elif kind == "select":
            tag = await element.evaluate("e => e.tagName.toLowerCase()")
            if tag == "select":
                try:
                    await element.select_option(label=value, timeout=ACTION_TIMEOUT_MS)
                except Exception:
                    await element.select_option(value=value, timeout=ACTION_TIMEOUT_MS)
                outcome = f'selected "{value}" in {described}'
            else:
                # Custom dropdown: open it, then click the option.
                await element.click(timeout=ACTION_TIMEOUT_MS)
                await page.wait_for_timeout(ACTION_SETTLE_MS)
                option = await self._locate(page, value)
                await option.click(timeout=ACTION_TIMEOUT_MS)
                outcome = f'opened {described} and clicked "{value}"'
        else:
            raise ValueError(f"unknown action type {kind!r}")

        await page.wait_for_timeout(ACTION_SETTLE_MS)
        return outcome
