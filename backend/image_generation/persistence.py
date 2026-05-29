from typing import Literal

import httpx

from config import BACKEND_SAAS_API_SECRET, BACKEND_SAAS_URL, IS_PROD


SourceProvider = Literal["replicate", "openai"]


async def persist_asset_image_url(
    source_url: str,
    source_provider: SourceProvider,
    image_generation_model: str,
    generation_group_id: str | None,
    variant_index: int | None,
    prompt: str | None,
) -> str:
    if not IS_PROD or not BACKEND_SAAS_URL or not BACKEND_SAAS_API_SECRET:
        return source_url
    if not generation_group_id or variant_index is None:
        return source_url

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BACKEND_SAAS_URL}/assets/store_image_url",
            json={
                "source_url": source_url,
                "source_provider": source_provider,
                "image_generation_model": image_generation_model,
                "generation_group_id": generation_group_id,
                "variant_index": variant_index,
                "prompt": prompt,
            },
            headers={"Authorization": f"Bearer {BACKEND_SAAS_API_SECRET}"},
            timeout=45,
        )
        response.raise_for_status()
        response_data = response.json()

    public_url = response_data.get("public_url")
    if not isinstance(public_url, str) or not public_url:
        raise ValueError("SaaS generated asset response did not include public_url")

    return public_url
