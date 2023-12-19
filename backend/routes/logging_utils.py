from enum import Enum
import httpx
from openai.types.chat import ChatCompletionMessageParam
from typing import List
import json

from config import IS_PROD


class PaymentMethod(Enum):
    LEGACY = "legacy"
    UNKNOWN = "unknown"
    OPENAI_API_KEY = "openai_api_key"
    SUBSCRIPTION = "subscription"
    ACCESS_CODE = "access_code"


async def send_to_saas_backend(
    prompt_messages: List[ChatCompletionMessageParam],
    completion: str,
    payment_method: PaymentMethod,
    auth_token: str | None = None,
):
    if IS_PROD:
        async with httpx.AsyncClient() as client:
            url = "https://screenshot-to-code-saas.onrender.com/generations/store"
            # url = "http://localhost:8001/generations/store"

            data = json.dumps(
                {
                    "prompt": json.dumps(prompt_messages),
                    "completion": completion,
                    "payment_method": payment_method.value,
                }
            )

            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}",  # Add the auth token to the headers
            }

            response = await client.post(url, content=data, headers=headers)
            response_data = response.json()
            return response_data
