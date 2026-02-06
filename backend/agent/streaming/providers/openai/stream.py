from typing import Any, Dict, List

from openai import AsyncOpenAI

from llm import Llm, get_openai_api_name, get_openai_reasoning_effort


async def create_responses_stream(
    client: AsyncOpenAI,
    model: Llm,
    input_items: List[Dict[str, Any]],
    tools: List[Dict[str, Any]],
) -> Any:
    params: Dict[str, Any] = {
        "model": get_openai_api_name(model),
        "input": input_items,
        "tools": tools,
        "tool_choice": "auto",
        "stream": True,
        "max_output_tokens": 30000,
    }

    reasoning_effort = get_openai_reasoning_effort(model)
    if reasoning_effort:
        params["reasoning"] = {"effort": reasoning_effort}

    responses_client = getattr(client, "responses", None)
    if responses_client is None:
        raise Exception(
            "OpenAI SDK is too old for GPT-5.2 Codex. Please upgrade the 'openai' package to a version that supports the Responses API."
        )

    return await responses_client.create(**params)  # type: ignore
