import base64
from typing import Any, Dict, List, Optional, cast

from asset_extraction import extract_assets_from_images
from uploaded_assets.store import persist_data_url_as_asset

from agent.state import ensure_str
from agent.tools.summaries import summarize_text
from agent.tools.types import ToolExecutionResult, ToolMultimodalPart


IMAGE_EXTENSION_BY_MIME_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def _image_data_url_to_multimodal_part(
    data_url: str,
    display_name: str,
) -> ToolMultimodalPart | None:
    if not data_url.startswith("data:image/") or "," not in data_url:
        return None

    header, encoded = data_url.split(",", 1)
    mime_type = header.removeprefix("data:").split(";", 1)[0].lower()
    if mime_type not in {"image/png", "image/jpeg", "image/webp"}:
        return None

    try:
        data = base64.b64decode(encoded, validate=True)
    except ValueError:
        return None

    return ToolMultimodalPart(
        display_name=display_name,
        mime_type=mime_type,
        data=data,
    )


async def run_extract_assets(
    args: Dict[str, Any],
    *,
    gemini_api_key: Optional[str],
    input_images: List[str],
    asset_base_url: str,
    user_id: Optional[str],
) -> ToolExecutionResult:
    if not gemini_api_key:
        return ToolExecutionResult(
            ok=False,
            result={"error": "Asset extraction requires GEMINI_API_KEY."},
            summary={"error": "Missing Gemini API key"},
        )

    if not input_images:
        return ToolExecutionResult(
            ok=False,
            result={"error": "No input images are available for asset extraction."},
            summary={"error": "No input images"},
        )

    raw_descriptions = args.get("asset_descriptions") or args.get("descriptions")
    if not isinstance(raw_descriptions, list) or not raw_descriptions:
        return ToolExecutionResult(
            ok=False,
            result={
                "error": "extract_assets requires a non-empty asset_descriptions list"
            },
            summary={"error": "Missing asset_descriptions"},
        )

    raw_description_items = cast(list[object], raw_descriptions)
    descriptions: List[str] = [
        description.strip()
        for description in raw_description_items
        if isinstance(description, str) and description.strip()
    ]
    if not descriptions:
        return ToolExecutionResult(
            ok=False,
            result={"error": "No valid asset descriptions provided"},
            summary={"error": "No valid asset_descriptions"},
        )

    extraction_result: Dict[str, Any] = await extract_assets_from_images(
        image_data_urls=input_images,
        asset_descriptions=descriptions,
        gemini_api_key=gemini_api_key,
    )
    assets = extraction_result.get("assets", [])
    promoted_assets: List[Dict[str, Any]] = []
    multimodal_parts: List[ToolMultimodalPart] = []
    if isinstance(assets, list):
        for index, raw_asset in enumerate(cast(list[object], assets)):
            if not isinstance(raw_asset, dict):
                continue
            asset = cast(Dict[str, Any], raw_asset)

            data_url = ensure_str(asset.get("data_url"))
            public_url: str | None = None
            content_type: str | None = None
            image_part_index: int | None = None
            image_display_name: str | None = None
            status = ensure_str(asset.get("status")) or "missing"

            if data_url:
                mime_type = data_url.split(";", 1)[0].removeprefix("data:")
                extension = IMAGE_EXTENSION_BY_MIME_TYPE.get(mime_type, ".png")
                display_name = f"asset_{index}{extension}"
                multimodal_part = _image_data_url_to_multimodal_part(
                    data_url,
                    display_name,
                )
                if multimodal_part:
                    multimodal_parts.append(multimodal_part)
                    image_part_index = len(multimodal_parts) - 1
                    image_display_name = display_name

                # Extraction is the commitment — the model asked for this crop,
                # so finalize it straight to a served asset (no temp staging).
                saved_asset = await persist_data_url_as_asset(
                    data_url,
                    asset_base_url,
                    user_id=user_id,
                )
                if saved_asset:
                    public_url = saved_asset.public_url
                    content_type = saved_asset.content_type
                    # No asset_id is surfaced on purpose: extracted crops are
                    # already finalized, and a save_assets-style id makes models
                    # redundantly call save_assets on them (which now fails — the
                    # crops were never temp-staged). The model embeds public_url.
                    status = "ok"
                else:
                    status = "error"

            promoted_assets.append(
                {
                    "description": asset.get("description"),
                    "public_url": public_url,
                    "content_type": content_type,
                    "status": status,
                    "image_part_index": image_part_index,
                    "image_display_name": image_display_name,
                    "box_2d": asset.get("box_2d"),
                    "image_index": asset.get("image_index"),
                    "label": asset.get("label"),
                }
            )

    result: Dict[str, Any] = {
        **extraction_result,
        "assets": promoted_assets,
    }
    if any(asset.get("status") != "ok" for asset in promoted_assets):
        result["error"] = (
            result.get("error")
            or "Could not persist every extracted asset to a public URL."
        )

    summary_assets: List[Dict[str, Any]] = []
    for asset in promoted_assets:
        public_url = ensure_str(asset.get("public_url"))
        summary_assets.append(
            {
                "description": summarize_text(
                    ensure_str(asset.get("description")), 120
                ),
                "status": ensure_str(asset.get("status")),
                "public_url": public_url,
                "content_type": ensure_str(asset.get("content_type")),
                "image_part_index": asset.get("image_part_index"),
                "image_display_name": asset.get("image_display_name"),
                "box_2d": asset.get("box_2d"),
                "image_index": asset.get("image_index"),
                "label": ensure_str(asset.get("label")),
            }
        )

    return ToolExecutionResult(
        ok=not result.get("error"),
        result=result,
        summary={
            "assets": summary_assets,
            "error": result.get("error"),
        },
        multimodal_parts=multimodal_parts,
    )
