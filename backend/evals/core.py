from config import (
    ANTHROPIC_API_KEY,
    GEMINI_API_KEY,
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
)
from llm import Llm, OPENAI_MODELS, ANTHROPIC_MODELS, GEMINI_MODELS
from agentic.runner import AgenticRunner
from prompts import assemble_prompt
from prompts.agentic_instructions import apply_tool_instructions
from prompts.types import Stack
from openai.types.chat import ChatCompletionMessageParam
from typing import Any, cast


async def generate_code_for_image(image_url: str, stack: Stack, model: Llm) -> str:
    prompt_messages = assemble_prompt([image_url], stack)
    if prompt_messages:
        first_message = cast(dict[str, Any], prompt_messages[0])
        first_content = first_message.get("content")
        if first_content:
            first_message["content"] = apply_tool_instructions(
                str(first_content),
                should_generate_images=True,
            )
    return await generate_code_core(prompt_messages, model)


async def generate_code_core(
    prompt_messages: list[ChatCompletionMessageParam], model: Llm
) -> str:
    async def send_message(
        _: str,
        __: str | None,
        ___: int,
        ____: dict[str, Any] | None = None,
        _____: str | None = None,
    ) -> None:
        # Evals do not stream tool/assistant messages to a frontend.
        return None

    if model in ANTHROPIC_MODELS and not ANTHROPIC_API_KEY:
        raise Exception("Anthropic API key not found")
    if model in GEMINI_MODELS and not GEMINI_API_KEY:
        raise Exception("Gemini API key not found")
    if model in OPENAI_MODELS and not OPENAI_API_KEY:
        raise Exception("OpenAI API key not found")

    print(f"[EVALS] Using agentic runner for model: {model.value}")

    runner = AgenticRunner(
        send_message=send_message,
        variant_index=0,
        openai_api_key=OPENAI_API_KEY,
        openai_base_url=OPENAI_BASE_URL,
        anthropic_api_key=ANTHROPIC_API_KEY,
        gemini_api_key=GEMINI_API_KEY,
        should_generate_images=True,
        image_cache={},
        initial_file_state=None,
        option_codes=None,
    )
    return await runner.run(model, prompt_messages)
