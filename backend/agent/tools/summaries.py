# pyright: reportUnknownVariableType=false
from typing import Any, Dict

from agent.state import AgentFileState, ensure_str
from agent.tools.types import ToolCall
from uploaded_assets.tools import summarize_save_assets_input


def summarize_text(value: str, limit: int = 240) -> str:
    if len(value) <= limit:
        return value
    return value[:limit] + "..."


def summarize_tool_input(tool_call: ToolCall, file_state: AgentFileState) -> Dict[str, Any]:
    args = tool_call.arguments or {}

    if tool_call.name == "create_file":
        content = ensure_str(args.get("content"))
        return {
            "path": args.get("path") or file_state.path,
            "contentLength": len(content),
            "preview": summarize_text(content, 200),
        }

    if tool_call.name == "edit_file":
        edits = args.get("edits")
        if not edits:
            edits = [
                {
                    "old_text": args.get("old_text"),
                    "new_text": args.get("new_text"),
                    "count": args.get("count"),
                }
            ]
        summary_edits = []
        for edit in edits if isinstance(edits, list) else []:
            summary_edits.append(
                {
                    "old_text": summarize_text(ensure_str(edit.get("old_text")), 160),
                    "new_text": summarize_text(ensure_str(edit.get("new_text")), 160),
                    "count": edit.get("count"),
                }
            )
        return {
            "path": args.get("path") or file_state.path,
            "edits": summary_edits,
        }

    if tool_call.name == "generate_images":
        prompts = args.get("prompts") or []
        if isinstance(prompts, list):
            return {
                "count": len(prompts),
                "prompts": [ensure_str(p) for p in prompts],
            }

    if tool_call.name == "remove_backgrounds":
        image_urls = args.get("image_urls") or []
        if isinstance(image_urls, list):
            return {
                "count": len(image_urls),
                "image_urls": [ensure_str(u) for u in image_urls],
            }
        return {"image_urls": []}

    if tool_call.name == "edit_images":
        raw_edits = args.get("edits") or []
        if not isinstance(raw_edits, list):
            return {"edits": []}

        edits = []
        for raw_edit in raw_edits:
            if not isinstance(raw_edit, dict):
                continue
            image_urls = raw_edit.get("image_urls") or []
            edits.append(
                {
                    "prompt": ensure_str(raw_edit.get("prompt")),
                    "image_urls": (
                        [ensure_str(url) for url in image_urls]
                        if isinstance(image_urls, list)
                        else []
                    ),
                    "aspect_ratio": raw_edit.get("aspect_ratio")
                    or "match_input_image",
                }
            )
        return {"count": len(raw_edits), "edits": edits}

    if tool_call.name == "extract_assets":
        descriptions = args.get("asset_descriptions") or args.get("descriptions") or []
        if isinstance(descriptions, list):
            return {
                "count": len(descriptions),
                "asset_descriptions": [ensure_str(item) for item in descriptions],
            }
        return {"asset_descriptions": []}

    if tool_call.name == "save_assets":
        return summarize_save_assets_input(args)

    if tool_call.name == "retrieve_option":
        return {
            "option_number": args.get("option_number"),
            "index": args.get("index"),
        }

    return args
