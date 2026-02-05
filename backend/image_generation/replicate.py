import asyncio
import httpx
from typing import Any


async def call_replicate_model(
    model_path: str, input: dict[str, Any], api_token: str
) -> Any:
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json",
    }

    data = {"input": input}

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"https://api.replicate.com/v1/models/{model_path}/predictions",
                headers=headers,
                json=data,
            )
            response.raise_for_status()
            response_json = response.json()

            prediction_id = response_json.get("id")
            if not prediction_id:
                raise ValueError("Prediction ID not found in initial response.")

            num_polls = 0
            max_polls = 100
            while num_polls < max_polls:
                num_polls += 1

                await asyncio.sleep(0.1)

                status_check_url = (
                    f"https://api.replicate.com/v1/predictions/{prediction_id}"
                )
                status_response = await client.get(status_check_url, headers=headers)
                status_response.raise_for_status()
                status_response_json = status_response.json()
                status = status_response_json.get("status")

                if status == "succeeded":
                    return status_response_json["output"]
                elif status == "error":
                    raise ValueError(
                        f"Inference errored out: {status_response_json.get('error', 'Unknown error')}"
                    )
                elif status == "failed":
                    raise ValueError("Inference failed")

            raise TimeoutError("Inference timed out")

        except httpx.HTTPStatusError as e:
            raise ValueError(f"HTTP error occurred: {e}")
        except httpx.RequestError as e:
            raise ValueError(f"An error occurred while requesting: {e}")
        except asyncio.TimeoutError:
            raise TimeoutError("Request timed out")
        except Exception as e:
            raise ValueError(f"An unexpected error occurred: {e}")


async def call_replicate_version(
    version: str, input: dict[str, Any], api_token: str
) -> Any:
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json",
    }

    data = {"version": version, "input": input}

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://api.replicate.com/v1/predictions",
                headers=headers,
                json=data,
            )
            response.raise_for_status()
            response_json = response.json()

            prediction_id = response_json.get("id")
            if not prediction_id:
                raise ValueError("Prediction ID not found in initial response.")

            num_polls = 0
            max_polls = 100
            while num_polls < max_polls:
                num_polls += 1

                await asyncio.sleep(0.1)

                status_check_url = (
                    f"https://api.replicate.com/v1/predictions/{prediction_id}"
                )
                status_response = await client.get(status_check_url, headers=headers)
                status_response.raise_for_status()
                status_response_json = status_response.json()
                status = status_response_json.get("status")

                if status == "succeeded":
                    return status_response_json["output"]
                elif status == "error":
                    raise ValueError(
                        f"Inference errored out: {status_response_json.get('error', 'Unknown error')}"
                    )
                elif status == "failed":
                    raise ValueError("Inference failed")

            raise TimeoutError("Inference timed out")

        except httpx.HTTPStatusError as e:
            raise ValueError(f"HTTP error occurred: {e}")
        except httpx.RequestError as e:
            raise ValueError(f"An error occurred while requesting: {e}")
        except asyncio.TimeoutError:
            raise TimeoutError("Request timed out")
        except Exception as e:
            raise ValueError(f"An unexpected error occurred: {e}")


async def remove_background(image_url: str, api_token: str) -> str:
    result = await call_replicate_version(
        "a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc",
        {
            "image": image_url,
            "format": "png",
            "reverse": False,
            "threshold": 0,
            "background_type": "rgba",
        },
        api_token,
    )
    # Handle different response formats
    if isinstance(result, str):
        return result
    if isinstance(result, dict) and "url" in result:
        return result["url"]
    if isinstance(result, list) and len(result) > 0:
        return result[0] if isinstance(result[0], str) else result[0].get("url", "")
    raise ValueError(f"Unexpected response from background remover: {result}")


async def call_replicate(input: dict[str, str | int], api_token: str) -> str:
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json",
    }

    data = {"input": input}

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://api.replicate.com/v1/models/black-forest-labs/flux-2-klein-4b/predictions",
                headers=headers,
                json=data,
            )
            response.raise_for_status()
            response_json = response.json()

            # Extract the id from the response
            prediction_id = response_json.get("id")
            if not prediction_id:
                raise ValueError("Prediction ID not found in initial response.")

            # Polling every 0.1 seconds until the status is succeeded or error (upto 10s)
            num_polls = 0
            max_polls = 100
            while num_polls < max_polls:
                num_polls += 1

                await asyncio.sleep(0.1)

                # Check the status
                status_check_url = (
                    f"https://api.replicate.com/v1/predictions/{prediction_id}"
                )
                status_response = await client.get(status_check_url, headers=headers)
                status_response.raise_for_status()
                status_response_json = status_response.json()
                status = status_response_json.get("status")

                # If status is succeeded or if there's an error, break out of the loop
                if status == "succeeded":
                    return status_response_json["output"][0]
                elif status == "error":
                    raise ValueError(
                        f"Inference errored out: {status_response_json.get('error', 'Unknown error')}"
                    )
                elif status == "failed":
                    raise ValueError("Inference failed")

            # If we've reached here, it means we've exceeded the max number of polls
            raise TimeoutError("Inference timed out")

        except httpx.HTTPStatusError as e:
            raise ValueError(f"HTTP error occurred: {e}")
        except httpx.RequestError as e:
            raise ValueError(f"An error occurred while requesting: {e}")
        except asyncio.TimeoutError:
            raise TimeoutError("Request timed out")
        except Exception as e:
            raise ValueError(f"An unexpected error occurred: {e}")
