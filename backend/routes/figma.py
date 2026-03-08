import re
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import FIGMA_ACCESS_TOKEN
from routes.screenshot import bytes_to_data_url

router = APIRouter()

FIGMA_API_BASE = "https://api.figma.com"


def parse_figma_url(url: str) -> tuple[str, Optional[str]]:
    """
    Parse a Figma URL to extract the file key and optional node ID.

    Supports URLs like:
      https://www.figma.com/design/ABC123/FileName?node-id=1-2
      https://www.figma.com/file/ABC123/FileName?node-id=1:2
      https://www.figma.com/design/ABC123/FileName
    """
    # Match file or design URLs
    match = re.search(r"figma\.com/(?:file|design|proto)/([a-zA-Z0-9]+)", url)
    if not match:
        raise ValueError(
            "Invalid Figma URL. Expected a URL like "
            "https://www.figma.com/design/<file_key>/..."
        )
    file_key = match.group(1)

    # Extract node-id from query params (can use - or : as separator)
    node_id: Optional[str] = None
    node_match = re.search(r"node-id=([^&]+)", url)
    if node_match:
        # Figma API expects colon-separated IDs, but URLs may use dashes
        node_id = node_match.group(1).replace("-", ":")

    return file_key, node_id


class FigmaExportRequest(BaseModel):
    figmaUrl: str
    accessToken: Optional[str] = None


class FigmaExportResponse(BaseModel):
    url: str


@router.post("/api/figma/export")
async def figma_export(request: FigmaExportRequest) -> FigmaExportResponse:
    """Export a Figma frame/node as a PNG image and return it as a data URL."""

    access_token = request.accessToken or FIGMA_ACCESS_TOKEN
    if not access_token:
        raise HTTPException(
            status_code=400,
            detail="Figma access token is required. Provide it in the request "
            "or set the FIGMA_ACCESS_TOKEN environment variable.",
        )

    try:
        file_key, node_id = parse_figma_url(request.figmaUrl)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    headers = {"X-Figma-Token": access_token}

    async with httpx.AsyncClient(timeout=60) as client:
        # If no node ID, get the first page's top-level frame
        if not node_id:
            file_resp = await client.get(
                f"{FIGMA_API_BASE}/v1/files/{file_key}?depth=1",
                headers=headers,
            )
            if file_resp.status_code == 403:
                raise HTTPException(
                    status_code=403,
                    detail="Figma access denied. Check your access token "
                    "and file permissions.",
                )
            if file_resp.status_code != 200:
                raise HTTPException(
                    status_code=502,
                    detail=f"Figma API error: {file_resp.text}",
                )
            file_data = file_resp.json()
            # Get first page, first child (top-level frame)
            pages = file_data.get("document", {}).get("children", [])
            if not pages or not pages[0].get("children"):
                raise HTTPException(
                    status_code=400,
                    detail="Could not find any frames in the Figma file. "
                    "Try specifying a node-id in the URL.",
                )
            node_id = pages[0]["children"][0]["id"]

        # Export the node as PNG
        params = {
            "ids": node_id,
            "format": "png",
            "scale": "2",
        }
        export_resp = await client.get(
            f"{FIGMA_API_BASE}/v1/images/{file_key}",
            headers=headers,
            params=params,
        )
        if export_resp.status_code == 403:
            raise HTTPException(
                status_code=403,
                detail="Figma access denied. Check your access token "
                "and file permissions.",
            )
        if export_resp.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"Figma image export error: {export_resp.text}",
            )

        export_data = export_resp.json()
        images = export_data.get("images", {})
        image_url = images.get(node_id)

        if not image_url:
            raise HTTPException(
                status_code=400,
                detail=f"Figma could not render node {node_id}. "
                "The node may not exist or may not be visible.",
            )

        # Download the rendered image
        img_resp = await client.get(image_url)
        if img_resp.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail="Failed to download rendered image from Figma.",
            )

        data_url = bytes_to_data_url(img_resp.content, "image/png")
        return FigmaExportResponse(url=data_url)
