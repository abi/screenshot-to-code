from config import (
    ANTHROPIC_API_KEY,
    GEMINI_API_KEY,
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
)
from llm import Llm, OPENAI_MODELS, ANTHROPIC_MODELS, GEMINI_MODELS
from agent.runner import AgenticRunner
from prompts import assemble_prompt
from prompts.types import Stack
from openai.types.chat import ChatCompletionMessageParam
from typing import Any


async def generate_code_for_image(image_url: str, stack: Stack, model: Llm) -> str:
    prompt_messages = assemble_prompt([image_url], stack)
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

    print(f"[EVALS] Using agent runner for model: {model.value}")

    runner = AgenticRunner(
        send_message=send_message,
        variant_index=0,
        openai_api_key=OPENAI_API_KEY,
        openai_base_url=OPENAI_BASE_URL,
        anthropic_api_key=ANTHROPIC_API_KEY,
        gemini_api_key=GEMINI_API_KEY,
        should_generate_images=True,
        initial_file_state=None,
        option_codes=None,
    )
    return await runner.run(model, prompt_messages)
