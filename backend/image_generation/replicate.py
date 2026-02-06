import asyncio
import httpx
from typing import Any, Mapping, cast


REPLICATE_API_BASE_URL = "https://api.replicate.com/v1"
FLUX_MODEL_PATH = "black-forest-labs/flux-2-klein-4b"
REMOVE_BACKGROUND_VERSION = (
    "a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc"
)
POLL_INTERVAL_SECONDS = 0.1
MAX_POLLS = 100


def _build_headers(api_token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json",
    }


def _extract_prediction_id(response_json: Mapping[str, Any]) -> str:
    prediction_id = response_json.get("id")
    if not isinstance(prediction_id, str) or not prediction_id:
        raise ValueError("Prediction ID not found in initial response.")
    return prediction_id


async def _poll_prediction(
    client: httpx.AsyncClient, prediction_id: str, headers: dict[str, str]
) -> dict[str, Any]:
    status_check_url = f"{REPLICATE_API_BASE_URL}/predictions/{prediction_id}"

    for _ in range(MAX_POLLS):
        await asyncio.sleep(POLL_INTERVAL_SECONDS)
        status_response = await client.get(status_check_url, headers=headers)
        status_response.raise_for_status()
        status_response_raw: Any = status_response.json()
        if not isinstance(status_response_raw, dict):
            raise ValueError("Invalid prediction status response.")
        status_response_json = cast(dict[str, Any], status_response_raw)

        status = status_response_json.get("status")
        if status == "succeeded":
            return cast(dict[str, Any], status_response_json)
        if status == "error":
            error_message = str(status_response_json.get("error", "Unknown error"))
            raise ValueError(f"Inference errored out: {error_message}")
        if status == "failed":
            raise ValueError("Inference failed")

    raise TimeoutError("Inference timed out")


async def _run_prediction(
    endpoint_url: str, payload: dict[str, Any], api_token: str
) -> Any:
    headers = _build_headers(api_token)

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(endpoint_url, headers=headers, json=payload)
            response.raise_for_status()
            response_json = response.json()
            if not isinstance(response_json, dict):
                raise ValueError("Invalid prediction creation response.")

            prediction_id = _extract_prediction_id(response_json)
            final_response = await _poll_prediction(client, prediction_id, headers)
            return final_response.get("output")
        except httpx.HTTPStatusError as exc:
            raise ValueError(f"HTTP error occurred: {exc}") from exc
        except httpx.RequestError as exc:
            raise ValueError(f"An error occurred while requesting: {exc}") from exc
        except asyncio.TimeoutError as exc:
            raise TimeoutError("Request timed out") from exc
        except (TimeoutError, ValueError):
            raise
        except Exception as exc:
            raise ValueError(f"An unexpected error occurred: {exc}") from exc


def _extract_output_url(result: Any, context: str) -> str:
    if isinstance(result, str):
        return result

    if isinstance(result, dict):
        url = cast(Any, result.get("url"))
        if isinstance(url, str) and url:
            return url

    if isinstance(result, list) and len(result) > 0:
        first: Any = result[0]
        if isinstance(first, str) and first:
            return first
        if isinstance(first, Mapping):
            url = cast(Any, first.get("url"))
            if isinstance(url, str) and url:
                return url

    raise ValueError(f"Unexpected response from {context}: {result}")


async def call_replicate_model(
    model_path: str, input: dict[str, Any], api_token: str
) -> Any:
    return await _run_prediction(
        f"{REPLICATE_API_BASE_URL}/models/{model_path}/predictions",
        {"input": input},
        api_token,
    )


async def call_replicate_version(
    version: str, input: dict[str, Any], api_token: str
) -> Any:
    return await _run_prediction(
        f"{REPLICATE_API_BASE_URL}/predictions",
        {"version": version, "input": input},
        api_token,
    )


async def remove_background(image_url: str, api_token: str) -> str:
    result = await call_replicate_version(
        REMOVE_BACKGROUND_VERSION,
        {
            "image": image_url,
            "format": "png",
            "reverse": False,
            "threshold": 0,
            "background_type": "rgba",
        },
        api_token,
    )
    return _extract_output_url(result, "background remover")


async def call_replicate(input: dict[str, str | int], api_token: str) -> str:
    result = await call_replicate_model(FLUX_MODEL_PATH, input, api_token)
    return _extract_output_url(result, "Flux prediction")
