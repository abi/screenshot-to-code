import asyncio
import httpx


async def call_replicate(
    replicate_model_version: str, input: dict[str, str | int], api_token: str
) -> str:
    url = "https://api.replicate.com/v1/predictions"
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json",
    }

    data = {"version": replicate_model_version, "input": input}

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=data)
            response.raise_for_status()
            response_json = response.json()

            # Extract the id from the response
            prediction_id = response_json.get("id")
            if not prediction_id:
                raise ValueError("Prediction ID not found in initial response.")

            # Polling every 1 second until the status is succeeded or error
            num_polls = 0
            max_polls = 100
            while num_polls < max_polls:
                num_polls += 1

                await asyncio.sleep(0.2)

                # Check the status
                status_check_url = f"{url}/{prediction_id}"
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
