import base64
import hashlib
import os
from typing import Any, Dict, Optional

from preview_screenshot import capture_preview_screenshot

from agent.state import AgentFileState
from agent.tools.types import ToolExecutionResult, ToolMultimodalPart
from config import SCREENSHOT_CACHE_DIR, SCREENSHOT_CACHE_ENABLED


PREVIEW_VIEWPORTS = ("desktop", "mobile")


def _screenshot_cache_key(html: str, viewport: str) -> str:
    """Deterministic cache key for an HTML+viewport pair."""
    return hashlib.sha256(f"{html}:{viewport}".encode()).hexdigest()


def _screenshot_cache_path(cache_key: str) -> str:
    return os.path.join(SCREENSHOT_CACHE_DIR, f"{cache_key}.png")


def _read_screenshot_cache(cache_key: str) -> Optional[bytes]:
    if not SCREENSHOT_CACHE_ENABLED:
        return None
    try:
        path = _screenshot_cache_path(cache_key)
        if os.path.isfile(path):
            with open(path, "rb") as f:
                return f.read()
    except OSError:
        pass
    return None


def _write_screenshot_cache(cache_key: str, image_bytes: bytes) -> None:
    if not SCREENSHOT_CACHE_ENABLED:
        return
    try:
        os.makedirs(SCREENSHOT_CACHE_DIR, exist_ok=True)
        path = _screenshot_cache_path(cache_key)
        with open(path, "wb") as f:
            f.write(image_bytes)
    except OSError:
        pass  # Cache writes are best-effort; never break generation.


def clear_screenshot_cache() -> int:
    """Remove all cached screenshot files. Returns the number of files removed."""
    if not os.path.isdir(SCREENSHOT_CACHE_DIR):
        return 0
    count = 0
    for filename in os.listdir(SCREENSHOT_CACHE_DIR):
        if filename.endswith(".png"):
            try:
                os.remove(os.path.join(SCREENSHOT_CACHE_DIR, filename))
                count += 1
            except OSError:
                pass
    return count


async def run_screenshot_preview(
    _args: Dict[str, Any],
    *,
    file_state: AgentFileState,
) -> ToolExecutionResult:
    """Render the current HTML and return screenshots.

    These previews are for *seeing*, not keeping: the model views them as
    attached image bytes (multimodal parts) to verify its work and never
    embeds them in its output, so they are NOT persisted as assets. A data
    URL is inlined into the summary purely so the UI can show the same preview.
    """
    if not file_state.content:
        return ToolExecutionResult(
            ok=False,
            result={"error": "No file exists yet. Call create_file first."},
            summary={"error": "No file to screenshot"},
        )

    screenshots: list[Dict[str, Any]] = []
    multimodal_parts: list[ToolMultimodalPart] = []
    try:
        for viewport in PREVIEW_VIEWPORTS:
            cache_key = _screenshot_cache_key(file_state.content, viewport)
            cached_bytes = _read_screenshot_cache(cache_key)
            if cached_bytes is not None:
                image_bytes = cached_bytes
            else:
                image_bytes = await capture_preview_screenshot(
                    file_state.content,
                    device=viewport,
                    full_page=True,
                )
                _write_screenshot_cache(cache_key, image_bytes)
            display_name = f"preview_{viewport}.png"
            image_part_index = len(multimodal_parts)
            encoded_image = base64.b64encode(image_bytes).decode("ascii")
            data_url = f"data:image/png;base64,{encoded_image}"
            screenshots.append(
                {
                    "viewport": viewport,
                    "full_page": True,
                    "image_part_index": image_part_index,
                    "image_display_name": display_name,
                    "image_bytes": len(image_bytes),
                    # Inlined for the UI thumbnail only — never stored as an asset.
                    "image_url": data_url,
                    "status": "ok",
                }
            )
            multimodal_parts.append(
                ToolMultimodalPart(
                    display_name=display_name,
                    mime_type="image/png",
                    data=image_bytes,
                )
            )
    except Exception as exc:
        print(f"Preview screenshot failed: {exc}")
        return ToolExecutionResult(
            ok=False,
            result={"error": f"Screenshot failed: {exc}"},
            summary={"error": "Screenshot failed"},
        )

    result: Dict[str, Any] = {
        "content": (
            "Full-page desktop and mobile screenshots of the current preview "
            "are attached."
        ),
        "details": {
            "screenshots": [
                {
                    "viewport": screenshot["viewport"],
                    "full_page": screenshot["full_page"],
                    "image_part_index": screenshot["image_part_index"],
                    "image_display_name": screenshot["image_display_name"],
                    "image_bytes": screenshot["image_bytes"],
                }
                for screenshot in screenshots
            ],
        },
    }
    summary: Dict[str, Any] = {
        "screenshots": screenshots,
        "status": "ok",
    }
    return ToolExecutionResult(
        ok=True,
        result=result,
        summary=summary,
        multimodal_parts=multimodal_parts,
    )
