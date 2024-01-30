import base64
from fastapi import APIRouter
from pydantic import BaseModel
import httpx
from config import PLATFORM_SCREENSHOTONE_API_KEY

from routes.saas_utils import does_user_have_subscription_credits

router = APIRouter()


def bytes_to_data_url(image_bytes: bytes, mime_type: str) -> str:
    base64_image = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:{mime_type};base64,{base64_image}"


async def capture_screenshot(
    target_url: str, api_key: str | None, auth_token: str, device: str = "desktop"
) -> bytes:
    api_base_url = "https://api.screenshotone.com/take"

    # Get auth token
    if not auth_token:
        raise Exception("No auth token with capture_screenshot")

    # TODO: Clean up this code and send the users correct error messages
    # If API key is not passed in, only use the platform ScreenshotOne API key if the user is a subscriber
    if not api_key:
        res = await does_user_have_subscription_credits(auth_token)
        if res.status == "not_subscriber":
            raise Exception(
                "capture_screenshot - User is not subscriber and has no API key"
            )
        elif res.status == "subscriber_has_credits":
            api_key = PLATFORM_SCREENSHOTONE_API_KEY
        elif res.status == "subscriber_has_no_credits":
            raise Exception("capture_screenshot - User has no credits")
        else:
            raise Exception(
                "capture_screenshot - Unknown error occurred when checking subscription credits"
            )

    params = {
        "access_key": api_key,
        "url": target_url,
        "full_page": "true",
        "device_scale_factor": "1",
        "format": "png",
        "block_ads": "true",
        "block_cookie_banners": "true",
        "block_trackers": "true",
        "cache": "false",
        "viewport_width": "342",
        "viewport_height": "684",
    }

    if device == "desktop":
        params["viewport_width"] = "1280"
        params["viewport_height"] = "832"

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.get(api_base_url, params=params)
        if response.status_code == 200 and response.content:
            return response.content
        else:
            raise Exception("Error taking screenshot")


class ScreenshotRequest(BaseModel):
    url: str
    apiKey: str | None
    authToken: str


class ScreenshotResponse(BaseModel):
    url: str


@router.post("/api/screenshot")
async def app_screenshot(request: ScreenshotRequest):
    # Extract the URL from the request body
    url = request.url
    api_key = request.apiKey
    auth_token = request.authToken

    # TODO: Add error handling
    image_bytes = await capture_screenshot(url, api_key=api_key, auth_token=auth_token)

    # Convert the image bytes to a data url
    data_url = bytes_to_data_url(image_bytes, "image/png")

    return ScreenshotResponse(url=data_url)
