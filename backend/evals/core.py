from config import ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY
from llm import Llm, ANTHROPIC_MODELS, GEMINI_MODELS
from models import (
    stream_claude_response,
    stream_gemini_response,
    stream_openai_response,
)
from prompts import assemble_prompt
from prompts.types import Stack
from openai.types.chat import ChatCompletionMessageParam


async def generate_code_for_image(image_url: str, stack: Stack, model: Llm) -> str:
    prompt_messages = assemble_prompt(image_url, stack)
    return await generate_code_core(prompt_messages, model)


async def generate_code_core(
    prompt_messages: list[ChatCompletionMessageParam], model: Llm
) -> str:

    async def process_chunk(_: str):
        pass

    if model in ANTHROPIC_MODELS:
        if not ANTHROPIC_API_KEY:
            raise Exception("Anthropic API key not found")

        completion = await stream_claude_response(
            prompt_messages,
            api_key=ANTHROPIC_API_KEY,
            callback=lambda x: process_chunk(x),
            model_name=model.value,
        )
    elif model in GEMINI_MODELS:
        if not GEMINI_API_KEY:
            raise Exception("Gemini API key not found")

        completion = await stream_gemini_response(
            prompt_messages,
            api_key=GEMINI_API_KEY,
            callback=lambda x: process_chunk(x),
            model_name=model.value,
        )
    else:
        if not OPENAI_API_KEY:
            raise Exception("OpenAI API key not found")

        completion = await stream_openai_response(
            prompt_messages,
            api_key=OPENAI_API_KEY,
            base_url=None,
            callback=lambda x: process_chunk(x),
            model_name=model.value,
        )

    return completion["code"]
