from enum import Enum
import httpx
from openai.types.chat import ChatCompletionMessageParam
from typing import Any, List, cast
import json

from agent.providers.token_usage import TokenUsage
from config import BACKEND_SAAS_API_SECRET, BACKEND_SAAS_URL, IS_PROD
from custom_types import InputMode
from llm import Llm
from prompts.prompt_types import Stack

SaasOtherInfoValue = str | bool | int | float | None


class PaymentMethod(Enum):
    LEGACY = "legacy"
    UNKNOWN = "unknown"
    OPENAI_API_KEY = "openai_api_key"
    SUBSCRIPTION = "subscription"
    TRIAL = "trial"
    FREE_TRIAL = "free_trial"


async def send_to_saas_backend(
    user_id: str,
    prompt_messages: List[ChatCompletionMessageParam],
    completion: str,
    duration: float,
    llm_version: Llm,
    generation_group_id: str,
    payment_method: PaymentMethod,
    stack: Stack,
    is_imported_from_code: bool,
    input_mode: InputMode,
    token_usage: TokenUsage,
    llm_cost_usd: float,
    other_info: dict[str, SaasOtherInfoValue] | None = None,
    video_data_url: str | None = None,
) -> dict[str, Any] | None:
    if IS_PROD:
        normalized_other_info = other_info or {}
        async with httpx.AsyncClient() as client:
            url = BACKEND_SAAS_URL + "/generations/store"

            data = json.dumps(
                {
                    "user_id": user_id,
                    "prompt": json.dumps(prompt_messages),
                    "completion": completion,
                    "duration": duration,
                    "llm_version": llm_version.value,
                    "generation_group_id": generation_group_id,
                    "payment_method": payment_method.value,
                    "stack": stack,
                    "is_imported_from_code": is_imported_from_code,
                    "includes_result_image": False,  # Deprecated
                    "input_mode": input_mode,
                    "llm_usage": {
                        "llm_input_tokens": token_usage.input,
                        "llm_output_tokens": token_usage.output,
                        "llm_cache_read_tokens": token_usage.cache_read,
                        "llm_cache_write_tokens": token_usage.cache_write,
                        "llm_total_tokens": token_usage.total,
                        "llm_cost_usd": llm_cost_usd,
                    },
                    "other_info": normalized_other_info,
                    "video_data_url": video_data_url,
                }
            )

            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {BACKEND_SAAS_API_SECRET}",  # Add the auth token to the headers
            }

            response = await client.post(url, content=data, headers=headers, timeout=10)
            response.raise_for_status()
            response_data = cast(dict[str, Any], response.json())
            return response_data

    return None
