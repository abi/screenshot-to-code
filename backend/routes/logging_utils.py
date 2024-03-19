from enum import Enum
import httpx
from openai.types.chat import ChatCompletionMessageParam
from typing import List
import json

from config import BACKEND_SAAS_URL, IS_PROD
from llm import Llm


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
    llm_version: Llm,
    auth_token: str | None = None,
):
    if IS_PROD:
        async with httpx.AsyncClient() as client:
            url = BACKEND_SAAS_URL + "/generations/store"

            data = json.dumps(
                {
                    "prompt": json.dumps(prompt_messages),
                    "completion": completion,
                    "payment_method": payment_method.value,
                    "llm_version": llm_version.value,
                }
            )

            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}",  # Add the auth token to the headers
            }

            response = await client.post(url, content=data, headers=headers)
            response_data = response.json()
            return response_data
