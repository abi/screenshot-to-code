import base64
from typing import Any, Dict, List

from preview_screenshot import (
    ACTION_TYPES,
    PreviewAction,
    PreviewRender,
    render_preview,
)

from agent.state import AgentFileState
from agent.tools.types import ToolExecutionResult, ToolMultimodalPart


PREVIEW_VIEWPORTS = ("desktop", "mobile")
MAX_ACTIONS = 15
MAX_SHOTS = 5


def parse_actions(raw: Any) -> List[PreviewAction]:
    """Validate the tool's ``actions`` argument; raises ValueError on bad input."""
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise ValueError("actions must be a list")
    items: List[Any] = list(raw)  # type: ignore[arg-type]
    if len(items) > MAX_ACTIONS:
        raise ValueError(f"at most {MAX_ACTIONS} actions per call")
    actions: List[PreviewAction] = []
    for index, item in enumerate(items, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"action {index} must be an object")
        entry: Dict[str, Any] = item  # type: ignore[assignment]
        kind = entry.get("type")
        if kind not in ACTION_TYPES:
            raise ValueError(
                f"action {index} has unknown type {kind!r}; use one of {', '.join(ACTION_TYPES)}"
            )
        target = entry.get("target")
        value = entry.get("value")
        actions.append(
            PreviewAction(
                type=kind,
                target=str(target) if target is not None else None,
                value=str(value) if value is not None else None,
            )
        )
    if sum(1 for a in actions if a.get("type") == "screenshot") > MAX_SHOTS - 1:
        raise ValueError(f"at most {MAX_SHOTS - 1} screenshot actions per call")
    return actions


async def run_screenshot_preview(
    args: Dict[str, Any],
    *,
    file_state: AgentFileState,
) -> ToolExecutionResult:
    """Render the current HTML and return screenshots.

    Without ``actions`` this returns full-page desktop and mobile renderings.
    With ``actions`` it loads the desktop page, replays them as a user would
    (click, type, select, scroll, ...) and returns viewport screenshots of the
    resulting state, plus the action log, the final URL/title and any script
    errors, so the model can check behavior and not just the initial layout.

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
    try:
        actions = parse_actions(args.get("actions"))
    except ValueError as exc:
        return ToolExecutionResult(
            ok=False,
            result={"error": f"Invalid actions: {exc}"},
            summary={"error": "Invalid actions"},
        )

    renders: List[tuple[str, PreviewRender]] = []
    try:
        if actions:
            renders.append(
                ("desktop", await render_preview(file_state.content, "desktop", False, actions))
            )
        else:
            for viewport in PREVIEW_VIEWPORTS:
                renders.append(
                    (viewport, await render_preview(file_state.content, viewport, True))
                )
    except Exception as exc:
        print(f"Preview screenshot failed: {exc}")
        return ToolExecutionResult(
            ok=False,
            result={"error": f"Screenshot failed: {exc}"},
            summary={"error": "Screenshot failed"},
        )

    screenshots: list[Dict[str, Any]] = []
    multimodal_parts: list[ToolMultimodalPart] = []
    errors: List[str] = []
    for viewport, rendered in renders:
        for error in rendered.errors:
            if error not in errors:
                errors.append(error)
        for shot in rendered.shots:
            suffix = "" if shot.label == "initial" else "_" + "_".join(shot.label.split())
            display_name = f"preview_{viewport}{suffix}.png"
            image_part_index = len(multimodal_parts)
            encoded_image = base64.b64encode(shot.png).decode("ascii")
            screenshots.append(
                {
                    "viewport": viewport,
                    "label": shot.label,
                    "full_page": shot.full_page,
                    "image_part_index": image_part_index,
                    "image_display_name": display_name,
                    "image_bytes": len(shot.png),
                    # Inlined for the UI thumbnail only — never stored as an asset.
                    "image_url": f"data:image/png;base64,{encoded_image}",
                    "status": "ok",
                }
            )
            multimodal_parts.append(
                ToolMultimodalPart(
                    display_name=display_name,
                    mime_type="image/png",
                    data=shot.png,
                )
            )

    details: Dict[str, Any] = {
        "screenshots": [
            {key: value for key, value in screenshot.items() if key not in ("image_url", "status")}
            for screenshot in screenshots
        ],
        "errors": errors,
    }
    if actions:
        _, rendered = renders[0]
        details.update(actions=rendered.action_log, final_url=rendered.url, title=rendered.title)
        content = (
            "Replayed the actions on the desktop preview. Viewport screenshots of the "
            "resulting state are attached, in order."
        )
    else:
        content = "Full-page desktop and mobile screenshots of the current preview are attached."
    if errors:
        content += " The page reported script errors (see details.errors)."
    summary: Dict[str, Any] = {"screenshots": screenshots, "status": "ok", "errors": errors}
    if actions:
        summary.update(
            actions=details["actions"], final_url=details["final_url"], title=details["title"]
        )
    return ToolExecutionResult(
        ok=True,
        result={"content": content, "details": details},
        summary=summary,
        multimodal_parts=multimodal_parts,
    )
