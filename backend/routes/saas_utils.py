import asyncio

import httpx
from pydantic import BaseModel
from pydantic import ValidationError

from config import BACKEND_SAAS_URL


class SubscriptionCreditsResponse(BaseModel):
    user_id: str
    status: str


class SubscriptionCreditsCheckError(Exception):
    # Raised when subscription verification cannot be completed reliably.
    # We surface this as a user-safe message instead of leaking transport details.
    pass


async def does_user_have_subscription_credits(
    auth_token: str,
) -> SubscriptionCreditsResponse:
    url = BACKEND_SAAS_URL + "/credits/has_credits"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}",
    }
    # This endpoint is called on the critical request path before generation starts.
    # In production we occasionally see transient TLS EOF/connect failures to the SaaS
    # backend. Retrying here prevents one-off network blips from failing a generation.
    max_attempts = 3

    async with httpx.AsyncClient() as client:
        for attempt in range(1, max_attempts + 1):
            try:
                response = await client.post(url, headers=headers, timeout=60)
                response.raise_for_status()
                parsed_response = SubscriptionCreditsResponse.model_validate(
                    response.json()
                )
                return parsed_response
            except (httpx.ConnectError, httpx.ReadTimeout, httpx.RemoteProtocolError) as exc:
                # Retry only transient network/protocol errors.
                if attempt == max_attempts:
                    raise SubscriptionCreditsCheckError(
                        "Unable to verify subscription status right now. Please try again."
                    ) from exc
                await asyncio.sleep(0.25 * attempt)
            except (httpx.HTTPStatusError, ValidationError, ValueError) as exc:
                # Non-transient/API-shape failures should fail fast with a stable
                # user-facing message (no retry loop needed).
                raise SubscriptionCreditsCheckError(
                    "Unable to verify subscription status right now. Please try again."
                ) from exc

    # Defensive fallback for static analysis; loop always returns or raises.
    raise SubscriptionCreditsCheckError(
        "Unable to verify subscription status right now. Please try again."
    )
