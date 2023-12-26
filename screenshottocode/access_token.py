import json
import os
import httpx


async def validate_access_token(access_code: str):
    async with httpx.AsyncClient() as client:
        url = (
            "https://backend.buildpicoapps.com/screenshot_to_code/validate_access_token"
        )
        data = json.dumps(
            {
                "access_code": access_code,
                "secret": os.environ.get("PICO_BACKEND_SECRET"),
            }
        )
        headers = {"Content-Type": "application/json"}

        response = await client.post(url, content=data, headers=headers)
        response_data = response.json()
        return response_data
