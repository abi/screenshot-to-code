from enum import Enum
import httpx
from openai.types.chat import ChatCompletionMessageParam
from typing import List
import json

from config import BACKEND_SAAS_API_SECRET, BACKEND_SAAS_URL, IS_PROD
from custom_types import InputMode
from llm import Llm
from prompts.types import Stack


class PaymentMethod(Enum):
    LEGACY = "legacy"
    UNKNOWN = "unknown"
    OPENAI_API_KEY = "openai_api_key"
    SUBSCRIPTION = "subscription"
    TRIAL = "trial"


async def send_to_saas_backend(
    user_id: str,
    prompt_messages: List[ChatCompletionMessageParam],
    completions: list[str],
    llm_versions: list[Llm],
    payment_method: PaymentMethod,
    stack: Stack,
    is_imported_from_code: bool,
    includes_result_image: bool,
    input_mode: InputMode,
    other_info: dict[str, str | bool] = {},
):
    if IS_PROD:
        async with httpx.AsyncClient() as client:
            url = BACKEND_SAAS_URL + "/generations/store"

            data = json.dumps(
                {
                    "user_id": user_id,
                    "prompt": json.dumps(prompt_messages),
                    "completions": completions,
                    "payment_method": payment_method.value,
                    "llm_versions": [llm_version.value for llm_version in llm_versions],
                    "stack": stack,
                    "is_imported_from_code": is_imported_from_code,
                    "includes_result_image": includes_result_image,
                    "input_mode": input_mode,
                    "other_info": other_info,
                }
            )

            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {BACKEND_SAAS_API_SECRET}",  # Add the auth token to the headers
            }

            response = await client.post(url, content=data, headers=headers, timeout=10)
            response.raise_for_status()
            response_data = response.json()
            return response_data
