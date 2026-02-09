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
        "max_output_tokens": 50000,
    }

    reasoning_effort = get_openai_reasoning_effort(model)
    if reasoning_effort:
        params["reasoning"] = {"effort": reasoning_effort, "summary": "auto"}

    return await client.responses.create(**params)  # type: ignore
