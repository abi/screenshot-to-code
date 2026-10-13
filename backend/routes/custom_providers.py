"""
Custom Provider Routes
======================
Provides a backend proxy for fetching available models from any
OpenAI-compatible endpoint. This avoids CORS/mixed-content issues when the
user's custom provider (e.g. Ollama at localhost) can't be reached directly
from the browser.
"""

import asyncio
from typing import Optional

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from openai import AsyncOpenAI, APIConnectionError, AuthenticationError

router = APIRouter()

# Seconds to wait for a model list response before giving up
_FETCH_TIMEOUT_SECONDS = 8


@router.get("/api/custom-providers/models")
async def list_custom_provider_models(
    base_url: str = Query(..., description="Base URL of the OpenAI-compatible provider"),
    api_key: Optional[str] = Query(default=None, description="API key (optional)"),
) -> JSONResponse:
    """
    Proxy: fetch the model list from an OpenAI-compatible provider.

    Returns
    -------
    200  { "models": [{ "id": "llama3.2" }, ...] }
    422  { "error": "<human-readable error message>" }
    """
    # Basic sanity check on the URL
    if not base_url.startswith(("http://", "https://")):
        return JSONResponse(
            status_code=422,
            content={"error": "Base URL must start with http:// or https://"},
        )

    client = AsyncOpenAI(
        base_url=base_url.rstrip("/"),
        api_key=api_key or "none",  # many local servers don't validate the key
        timeout=_FETCH_TIMEOUT_SECONDS,
        max_retries=0,
    )

    try:
        response = await asyncio.wait_for(
            client.models.list(),
            timeout=_FETCH_TIMEOUT_SECONDS,
        )
        models = [{"id": m.id} for m in response.data]
        if not models:
            return JSONResponse(
                status_code=422,
                content={
                    "error": (
                        "Provider returned no models. "
                        "It may not support the /v1/models endpoint."
                    )
                },
            )
        return JSONResponse(content={"models": models})

    except asyncio.TimeoutError:
        return JSONResponse(
            status_code=422,
            content={
                "error": (
                    "Request timed out. Check the URL and ensure the server is running."
                )
            },
        )
    except AuthenticationError:
        return JSONResponse(
            status_code=422,
            content={"error": "Invalid API key for this provider."},
        )
    except APIConnectionError:
        return JSONResponse(
            status_code=422,
            content={
                "error": (
                    "Could not connect to the provider. "
                    "Check the URL and make sure the server is running."
                )
            },
        )
    except Exception as e:
        return JSONResponse(
            status_code=422,
            content={"error": f"Unexpected error: {str(e)}"},
        )
    finally:
        await client.close()
