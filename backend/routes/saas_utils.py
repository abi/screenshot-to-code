import httpx
from pydantic import BaseModel


class SubscriptionCreditsResponse(BaseModel):
    status: str


async def does_user_have_subscription_credits(
    auth_token: str,
):
    async with httpx.AsyncClient() as client:
        url = "https://screenshot-to-code-saas.onrender.com/credits/has_credits"
        # url = "http://localhost:8001/credits/has_credits"

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}",
        }

        response = await client.post(url, headers=headers)
        parsed_response = SubscriptionCreditsResponse.parse_obj(response.json())
        return parsed_response
