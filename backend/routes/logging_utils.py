from enum import Enum
import httpx
from openai.types.chat import ChatCompletionMessageParam
from typing import List
import json

from config import BACKEND_SAAS_URL, IS_PROD
from llm import Llm
from prompts.types import Stack


class PaymentMethod(Enum):
    LEGACY = "legacy"
    UNKNOWN = "unknown"
    OPENAI_API_KEY = "openai_api_key"
    SUBSCRIPTION = "subscription"
    TRIAL = "trial"


async def send_to_saas_backend(
    prompt_messages: List[ChatCompletionMessageParam],
    completion: str,
    payment_method: PaymentMethod,
    llm_version: Llm,
    stack: Stack,
    is_imported_from_code: bool,
    includes_result_image: bool,
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
                    "stack": stack,
                    "is_imported_from_code": is_imported_from_code,
                    "includes_result_image": includes_result_image,
                }
            )

            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}",  # Add the auth token to the headers
            }

            response = await client.post(url, content=data, headers=headers)
            response_data = response.json()
            return response_data
