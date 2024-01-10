import httpx
from pydantic import BaseModel

from config import BACKEND_SAAS_URL


class SubscriptionCreditsResponse(BaseModel):
    status: str


async def does_user_have_subscription_credits(
    auth_token: str,
):
    async with httpx.AsyncClient() as client:
        url = BACKEND_SAAS_URL + "/credits/has_credits"

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}",
        }

        response = await client.post(url, headers=headers, timeout=60)
        parsed_response = SubscriptionCreditsResponse.parse_obj(response.json())
        return parsed_response
