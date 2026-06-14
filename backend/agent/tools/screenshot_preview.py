import base64
from typing import Any, Dict

from preview_screenshot import capture_preview_screenshot

from agent.state import AgentFileState
from agent.tools.types import ToolExecutionResult, ToolMultimodalPart
from uploaded_assets.store import (
    persist_data_url_as_temporary_asset,
    promote_temporary_asset_id,
)


PREVIEW_VIEWPORTS = ("desktop", "mobile")


async def run_screenshot_preview(
    _args: Dict[str, Any],
    *,
    file_state: AgentFileState,
    asset_base_url: str,
) -> ToolExecutionResult:
    """Render the current HTML in headless Chromium and return screenshots.

    PNGs are attached as multimodal parts so the model can visually verify
    its work; public URLs are kept in the summary for the UI.
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
            image_bytes = await capture_preview_screenshot(
                file_state.content,
                device=viewport,
                full_page=True,
            )
            display_name = f"preview_{viewport}.png"
            image_part_index = len(multimodal_parts)
            encoded_image = base64.b64encode(image_bytes).decode("ascii")
            data_url = f"data:image/png;base64,{encoded_image}"
            temporary_asset = persist_data_url_as_temporary_asset(
                data_url,
                asset_base_url,
            )
            if not temporary_asset:
                raise Exception(f"Could not persist {viewport} screenshot")
            saved_asset = await promote_temporary_asset_id(temporary_asset.asset_id)
            if not saved_asset:
                raise Exception(f"Could not publish {viewport} screenshot")
            screenshots.append(
                {
                    "viewport": viewport,
                    "full_page": True,
                    "image_part_index": image_part_index,
                    "image_display_name": display_name,
                    "image_bytes": len(image_bytes),
                    "image_url": saved_asset.public_url,
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
