from typing import Any, Dict, List, cast

from agent.state import ensure_str
from agent.tools.local_assets import local_asset_url_to_bytes
from agent.tools.types import (
    CanonicalToolDefinition,
    ToolExecutionResult,
    ToolMultimodalPart,
)
from uploaded_assets.store import promote_temporary_asset_id


def _summarize_text(value: str, limit: int = 240) -> str:
    if len(value) <= limit:
        return value
    return value[:limit] + "..."


def _save_assets_schema() -> Dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "asset_ids": {
                "type": "array",
                "items": {
                    "type": "string",
                    "description": (
                        "Opaque temporary asset ID for an uploaded image that should be "
                        "promoted to a permanent asset URL."
                    ),
                },
            },
        },
        "required": ["asset_ids"],
    }


SAVE_ASSETS_TOOL_DEFINITION = CanonicalToolDefinition(
    name="save_assets",
    description=(
        "Promote one or more uploaded temporary image asset IDs to permanent URLs. "
        "Use this before embedding any uploaded images in code. "
        "Returns permanent public_url values to use in the generated code."
    ),
    parameters=_save_assets_schema(),
)


def summarize_save_assets_input(args: Dict[str, Any]) -> Dict[str, Any]:
    raw_asset_ids = args.get("asset_ids")
    if isinstance(raw_asset_ids, list):
        asset_ids = cast(List[Any], raw_asset_ids)
        return {
            "count": len(asset_ids),
            "asset_ids": [ensure_str(asset_id) for asset_id in asset_ids],
        }
    return {"asset_ids": []}


async def run_save_assets(
    args: Dict[str, Any],
    user_id: str | None = None,
) -> ToolExecutionResult:
    raw_asset_ids = args.get("asset_ids")
    if not isinstance(raw_asset_ids, list) or not raw_asset_ids:
        return ToolExecutionResult(
            ok=False,
            result={"error": "save_assets requires a non-empty asset_ids list"},
            summary={"error": "Missing asset_ids"},
        )

    asset_ids = cast(List[Any], raw_asset_ids)
    cleaned = [
        asset_id.strip() for asset_id in asset_ids if isinstance(asset_id, str)
    ]
    unique_asset_ids = list(
        dict.fromkeys([asset_id for asset_id in cleaned if asset_id])
    )
    if not unique_asset_ids:
        return ToolExecutionResult(
            ok=False,
            result={"error": "No valid asset IDs provided"},
            summary={"error": "No valid asset_ids"},
        )

    results: List[Dict[str, Any]] = []
    for asset_id in unique_asset_ids:
        asset = await promote_temporary_asset_id(asset_id, user_id=user_id)
        if not asset:
            results.append(
                {
                    "asset_id": asset_id,
                    "public_url": None,
                    "content_type": None,
                    "status": "error",
                }
            )
            continue

        results.append(
            {
                "asset_id": asset_id,
                "public_url": asset.public_url,
                "content_type": asset.content_type,
                "status": "ok",
            }
        )

    summary_items: List[Dict[str, Any]] = []
    for result in results:
        summary_items.append(
            {
                "asset_id": _summarize_text(ensure_str(result["asset_id"]), 100),
                "public_url": result["public_url"],
                "content_type": result["content_type"],
                "status": result["status"],
            }
        )
    # Saved assets are served from localhost, which cloud models can't fetch,
    # so attach their bytes for the model to see.
    multimodal_parts: List[ToolMultimodalPart] = []
    for result in results:
        if result["status"] != "ok" or not result["public_url"]:
            continue
        read = local_asset_url_to_bytes(ensure_str(result["public_url"]))
        if read is None:
            continue
        data, mime_type = read
        multimodal_parts.append(
            ToolMultimodalPart(
                display_name=ensure_str(result["asset_id"]),
                mime_type=mime_type,
                data=data,
            )
        )

    return ToolExecutionResult(
        ok=True,
        result={"images": results},
        summary={"images": summary_items},
        multimodal_parts=multimodal_parts,
    )
