from typing import Any, List, cast

from google import genai
from google.genai import types

from llm import Llm
from agent.streaming.providers.gemini.transform import (
    get_gemini_api_model_name,
    get_thinking_level_for_model,
)


def create_generate_config(model: Llm, system_prompt: str, tools: List[types.Tool]) -> Any:
    thinking_level = get_thinking_level_for_model(model)
    return types.GenerateContentConfig(
        temperature=0,
        max_output_tokens=30000,
        system_instruction=system_prompt,
        thinking_config=types.ThinkingConfig(
            thinking_level=cast(Any, thinking_level),
            include_thoughts=True,
        ),
        tools=tools,
    )


async def create_stream(
    client: genai.Client,
    model: Llm,
    contents: List[types.Content],
    config: Any,
) -> Any:
    api_model_name = get_gemini_api_model_name(model)
    return await client.aio.models.generate_content_stream(
        model=api_model_name,
        contents=cast(Any, contents),
        config=config,
    )
